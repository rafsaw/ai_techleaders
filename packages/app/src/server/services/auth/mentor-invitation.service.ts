import { ConflictError, generateToken, hashToken, NotFoundError, summarizeError, type Cradle } from "@devmentor/core";
import { LockMode, MentorInvitation, UniqueConstraintViolationException, type EntityManager } from "@devmentor/db";

import { INVITATION_LIFETIME_DAYS } from "@/server/services/auth/mentor-invitation.policy";
import { mentorInvitationEmail } from "@/server/services/notifications/templates/mentor-invitation";

const DAY_MS = 24 * 60 * 60 * 1000;

/** What `create` and `resend` report: never the raw token or the link. */
export interface InvitationDeliveryDto {
  id: string;
  email: string;
  expiresAt: Date;
  /** Whether the SMTP server accepted the email (not inbox delivery). */
  emailSent: boolean;
}

/** What `revoke` did. `already-accepted`: nothing was open, and the latest invitation was accepted. */
export type InvitationRevokeDto =
  | { outcome: "revoked"; id: string; email: string }
  | { outcome: "none"; email: string }
  | { outcome: "already-accepted"; id: string; email: string; acceptedAt: Date };

/** The input of every management command: an address already normalized by `emailSchema`. */
export interface InvitationEmailInput {
  email: string;
}

/** A committed invitation whose link still has to be emailed. */
interface PendingInvitation {
  invitation: Pick<MentorInvitation, "id" | "email" | "expiresAt">;
  token: string;
}

export function activeInvitationConflict(email: string): ConflictError {
  return new ConflictError(`${email} already has an open invitation. Use invite resend or revoke.`);
}

export function noOpenInvitation(email: string): NotFoundError {
  return new NotFoundError(`${email} has no open invitation to resend. Use invite create.`);
}

/**
 * Operator management of email-bound mentor invitations (accounts Flow 3
 * step 1, AD5), used only by the operator CLI; there is no HTTP endpoint.
 *
 * - **One open row per address**: the partial unique index
 *   `mentor_invitations_open_email_unique` arbitrates concurrent creates, and
 *   the loser gets the same conflict as an active invitation.
 * - **Locks**: revoke and resend lock the open row (`FOR UPDATE`), the row an
 *   acceptance locks too, so the first to commit wins.
 * - **After commit only**: the email goes out once the hash is committed.
 *   A failed send leaves it committed (`emailSent: false`); the operator
 *   runs resend. The raw token exists only in memory and in the email.
 */
export class MentorInvitationService {
  private readonly em: EntityManager;
  private readonly clock: Cradle["clock"];
  private readonly config: Cradle["config"];
  private readonly logger: Cradle["logger"];
  private readonly emailSender: Cradle["emailSender"];

  constructor({ em, clock, config, logger, emailSender }: Pick<Cradle, "em" | "clock" | "config" | "logger" | "emailSender">) {
    this.em = em;
    this.clock = clock;
    this.config = config;
    this.logger = logger;
    this.emailSender = emailSender;
  }

  /**
   * Creates an invitation that expires exactly 14 days from now and emails
   * its link to the address. A still-valid open invitation is a conflict; an
   * expired open one is closed (`revoked_at`) in the same transaction first.
   */
  async create({ email }: InvitationEmailInput): Promise<InvitationDeliveryDto> {
    let pending: PendingInvitation;
    try {
      pending = await this.em.transactional(async (em) => {
        const open = await this.#lockOpen(em, email);
        if (open) {
          if (open.expiresAt.getTime() > this.clock.now().getTime()) throw activeInvitationConflict(email);
          open.revokedAt = this.clock.now();
          // Closed before the insert, so the partial unique index no longer counts it.
          await em.flush();
        }
        const token = generateToken();
        const invitation = em.create(MentorInvitation, {
          email,
          tokenHash: hashToken(token),
          expiresAt: this.#expiry(),
          consumedAt: null,
          revokedAt: null,
          acceptedBy: null,
        });
        em.persist(invitation);
        await em.flush();
        return { invitation, token };
      }, { clear: true });
    } catch (error) {
      // A concurrent create committed the open row first.
      if (error instanceof UniqueConstraintViolationException) throw activeInvitationConflict(email);
      throw error;
    }
    return this.#deliver(pending);
  }

  /**
   * Closes the open invitation, so its link stops working at once. Without
   * one it changes nothing; it then reports whether the latest invitation was
   * already accepted, because revoking never removes a granted mentor role.
   */
  async revoke({ email }: InvitationEmailInput): Promise<InvitationRevokeDto> {
    return this.em.transactional(async (em): Promise<InvitationRevokeDto> => {
      const open = await this.#lockOpen(em, email);
      if (open) {
        open.revokedAt = this.clock.now();
        return { outcome: "revoked", id: open.id, email };
      }
      const latest = await em.findOne(MentorInvitation, { email }, { orderBy: { createdAt: "desc" } });
      if (latest?.consumedAt) return { outcome: "already-accepted", id: latest.id, email, acceptedAt: latest.consumedAt };
      return { outcome: "none", email };
    }, { clear: true });
  }

  /**
   * Replaces the open invitation's token hash and expiry (14 days from now)
   * and emails the new link; the old link is invalid from the commit on, even
   * if the email fails. An expired open invitation may be resent; an accepted
   * or revoked one cannot be reopened (use create).
   */
  async resend({ email }: InvitationEmailInput): Promise<InvitationDeliveryDto> {
    const pending = await this.em.transactional(async (em): Promise<PendingInvitation> => {
      const open = await this.#lockOpen(em, email);
      if (!open) throw noOpenInvitation(email);
      const token = generateToken();
      open.tokenHash = hashToken(token);
      open.expiresAt = this.#expiry();
      return { invitation: open, token };
    }, { clear: true });
    return this.#deliver(pending);
  }

  /** The address's open invitation (expired or not), locked for this transaction. */
  async #lockOpen(em: EntityManager, email: string): Promise<MentorInvitation | null> {
    return em.findOne(
      MentorInvitation,
      { email, consumedAt: null, revokedAt: null },
      { lockMode: LockMode.PESSIMISTIC_WRITE },
    );
  }

  #expiry(): Date {
    return new Date(this.clock.now().getTime() + INVITATION_LIFETIME_DAYS * DAY_MS);
  }

  /**
   * Emails the committed link to the bound address. Any failure (SMTP,
   * missing mail or app configuration) is reported as `emailSent: false`,
   * because the invitation is committed either way and resend is the remedy;
   * the log gets a safe summary only, never the token, link or body.
   */
  async #deliver({ invitation, token }: PendingInvitation): Promise<InvitationDeliveryDto> {
    const dto = { id: invitation.id, email: invitation.email, expiresAt: invitation.expiresAt };
    try {
      const message = mentorInvitationEmail({
        appUrl: this.config.app().url,
        email: invitation.email,
        token,
        expiresInDays: INVITATION_LIFETIME_DAYS,
      });
      await this.emailSender.send({ to: invitation.email, ...message });
      return { ...dto, emailSent: true };
    } catch (error) {
      this.logger.warn("Mentor invitation email was not sent", { invitationId: invitation.id, cause: summarizeError(error) });
      return { ...dto, emailSent: false };
    }
  }
}
