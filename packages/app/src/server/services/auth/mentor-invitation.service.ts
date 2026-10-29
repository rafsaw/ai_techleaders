import {
  ConflictError,
  ForbiddenError,
  generateToken,
  hashToken,
  isWellFormedToken,
  NotFoundError,
  summarizeError,
  UnauthorizedError,
  type Cradle,
  type Principal,
} from "@devmentor/core";
import { INVITATION_INVALID_MESSAGE } from "@devmentor/core/validators/auth/invitation-accept.schema";
import {
  consumeSingleUseToken,
  inspectSingleUseToken,
  LockMode,
  MentorInvitation,
  UniqueConstraintViolationException,
  User,
  UserRole,
  type EntityManager,
} from "@devmentor/db";

import type { AccountDto } from "@/server/services/auth/user.service";
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

/**
 * What `/invite/[token]` shows (accounts Flow 3 step 2). An unknown,
 * malformed, used, expired, revoked or rotated (resent) link is one `invalid`
 * state. A mismatching or unverified account sees only its own address, never
 * the invited one.
 */
export type InvitationPageState =
  | { status: "invalid" }
  | { status: "signed-out" }
  | { status: "mismatch"; currentEmail: string }
  | { status: "already-mentor" }
  | { status: "valid"; displayName: string; email: string };

/** The 403 for an account whose verified address is not the invited one; it never names that address. */
export const INVITATION_EMAIL_MISMATCH_MESSAGE = "This invitation requires the verified email address it was sent to";
/** The 409 for an account that already holds mentor; the invitation stays unconsumed. */
export const ALREADY_MENTOR_MESSAGE = "You already have the mentor role";

function invalidInvitation(): NotFoundError {
  return new NotFoundError(INVITATION_INVALID_MESSAGE);
}

/** Only a verified account whose (normalized) address is the bound one may accept. */
function isInvitee(user: User, invitation: MentorInvitation): boolean {
  return user.emailConfirmedAt != null && user.email === invitation.email;
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
  private readonly roleService: Cradle["roleService"];
  private readonly userService: Cradle["userService"];

  constructor({
    em,
    clock,
    config,
    logger,
    emailSender,
    roleService,
    userService,
  }: Pick<Cradle, "em" | "clock" | "config" | "logger" | "emailSender" | "roleService" | "userService">) {
    this.em = em;
    this.clock = clock;
    this.config = config;
    this.logger = logger;
    this.emailSender = emailSender;
    this.roleService = roleService;
    this.userService = userService;
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

  /**
   * The state of an invitation link for `/invite/[token]` and who is looking
   * (accounts Flow 3 step 2). Reads only: it never consumes, locks or
   * changes anything (AD5), so a mail scanner's GET is harmless.
   */
  async inspect(token: string, principal: Principal | null): Promise<InvitationPageState> {
    const invitation = await this.#usable(this.em, token);
    if (!invitation) return { status: "invalid" };
    if (!principal) return { status: "signed-out" };
    const user = await this.em.findOne(User, { id: principal.userId });
    // A session whose account is gone (deleted meanwhile) is no one.
    if (!user) return { status: "signed-out" };
    if (!isInvitee(user, invitation)) return { status: "mismatch", currentEmail: user.email };
    if (await this.#isMentor(this.em, user.id)) return { status: "already-mentor" };
    return { status: "valid", displayName: user.name, email: user.email };
  }

  /**
   * Accepts the invitation for the signed-in account (accounts Flow 3 step
   * 3). One transaction locks the user, then the invitation (the credential
   * lock order; revoke and resend lock the same invitation row), and re-reads
   * both under the locks:
   *
   * - unknown, used, expired, revoked or rotated: 404 `not_found`;
   * - unverified, or another address: 403 `forbidden`, nothing consumed;
   * - already a mentor: 409 `conflict`, nothing consumed;
   * - otherwise consume the token (P9), record `acceptedBy` and add mentor
   *   through `RoleService.grantMentorFromInvitation`, keeping every role.
   *
   * The session is not touched: no rotation, and ordinary P3 renewal sets the
   * cookie. Returns the account as it is now, mentor included.
   */
  async accept(token: string, principal: Principal): Promise<AccountDto> {
    await this.em.transactional(async (em) => {
      const user = await em.findOne(User, { id: principal.userId }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      if (!user) throw new UnauthorizedError();
      if (isWellFormedToken(token)) {
        await em.findOne(MentorInvitation, { tokenHash: hashToken(token) }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      }
      const invitation = await this.#usable(em, token);
      if (!invitation) throw invalidInvitation();
      if (!isInvitee(user, invitation)) throw new ForbiddenError(INVITATION_EMAIL_MISMATCH_MESSAGE);
      if (await this.#isMentor(em, user.id)) throw new ConflictError(ALREADY_MENTOR_MESSAGE);

      const consumed = await consumeSingleUseToken(em, MentorInvitation, token, this.clock.now());
      if (consumed.status !== "consumed") throw invalidInvitation();
      consumed.record.acceptedBy = user;
      this.roleService.grantMentorFromInvitation(em, { user, invitation: consumed.record });
    }, { clear: true });
    return this.userService.getAccount(principal.userId);
  }

  /**
   * The invitation behind a raw token while it can still be accepted: found
   * by hash (P9), unused, unexpired and not revoked. Revocation is this
   * concept's own rule, so the generic token helper does not know it; a
   * rotated (resent) token no longer matches any hash.
   */
  async #usable(em: EntityManager, token: string): Promise<MentorInvitation | null> {
    const lookup = await inspectSingleUseToken(em, MentorInvitation, token, this.clock.now());
    if (lookup.status !== "valid" || lookup.record.revokedAt) return null;
    return lookup.record;
  }

  async #isMentor(em: EntityManager, userId: string): Promise<boolean> {
    return (await em.count(UserRole, { user: userId, role: "mentor" })) > 0;
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
