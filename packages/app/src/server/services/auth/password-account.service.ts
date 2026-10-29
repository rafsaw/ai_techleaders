import {
  AppError,
  generateToken,
  hashToken,
  NotFoundError,
  summarizeError,
  TooManyRequestsError,
  type Cradle,
  type RateLimitRule,
  type ResponseCookies,
} from "@devmentor/core";
import type { EmailConfirmInput } from "@devmentor/core/validators/auth/email-confirm.schema";
import { RETURN_TO_FALLBACK } from "@devmentor/core/validators/auth/return-to.schema";
import type { SignInInput } from "@devmentor/core/validators/auth/sign-in.schema";
import type { SignUpInput } from "@devmentor/core/validators/auth/sign-up.schema";
import {
  consumeSingleUseToken,
  EmailConfirmationToken,
  inspectSingleUseToken,
  LockMode,
  UniqueConstraintViolationException,
  User,
  UserRole,
  type EntityManager,
} from "@devmentor/db";

import { EmailSendError } from "@/server/services/notifications/email-sender.port";
import { accountExistsEmail } from "@/server/services/notifications/templates/account-exists";
import { emailConfirmationEmail } from "@/server/services/notifications/templates/email-confirmation";

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

/** A confirmation link stays valid this long (accounts Flow 2). */
export const CONFIRMATION_LINK_LIFETIME_HOURS = 24;

// Two attempts: the second sees the row a concurrent registration committed.
const REGISTER_ATTEMPTS = 2;

interface PasswordRateLimitRule extends RateLimitRule {
  /** Names the rule inside the limiter key, so two rules never share a bucket. */
  id: string;
  subject: "ip" | "email";
}

/**
 * The four rate-limit rules of accounts API Contracts. Keys are
 * `<id>:<subject>:<value>` (e.g. `sign-in:email:ada@example.com`); the
 * limiter stores only their hash. Sign-in and email confirmation share rules
 * 1 and 2; rule 4 counts every confirmation-type email to an address.
 */
export const PASSWORD_RATE_LIMITS = {
  signInPerIp: { id: "sign-in", subject: "ip", limit: 10, windowMs: 15 * MINUTE_MS },
  signInPerEmail: { id: "sign-in", subject: "email", limit: 5, windowMs: 15 * MINUTE_MS },
  signUpPerIp: { id: "sign-up", subject: "ip", limit: 5, windowMs: HOUR_MS },
  confirmationEmailPerAddress: { id: "confirmation-email", subject: "email", limit: 3, windowMs: HOUR_MS },
} as const satisfies Record<string, PasswordRateLimitRule>;

/** The limiter key of `rule` for a normalized email or a validated IP. */
export function rateLimitKey(rule: PasswordRateLimitRule, value: string): string {
  return `${rule.id}:${rule.subject}:${value}`;
}

/** Wrong email or password, or an account without a password: one generic answer. */
export class InvalidCredentialsError extends AppError {
  constructor() {
    super("Email or password is incorrect", "invalid_credentials", 401);
  }
}

/** The password was right, but the address is not confirmed yet; the form offers resend. */
export class EmailNotConfirmedError extends AppError {
  constructor() {
    super("Confirm your email first", "email_not_confirmed", 403);
  }
}

/** Why a confirmation link cannot be used; the `/confirm-email` page shows one state each. */
export type ConfirmationLinkProblem = "expired" | "used" | "invalid";

/** The 404 message for each unusable link (API Contracts: reason-specific). */
export const CONFIRMATION_LINK_MESSAGES: Record<ConfirmationLinkProblem, string> = {
  expired: "This link has expired. Sign in to get a new one",
  used: "Your address is already confirmed. Sign in",
  invalid: "This link isn't valid. Sign in to continue",
};

/**
 * What `/confirm-email` shows (accounts Flow 2). `used` means the link was
 * used and the address is confirmed; a link replaced by a newer one, or
 * invalidated by a GitHub claim, is `invalid`.
 */
export type ConfirmationLinkState = { status: "valid"; email: string } | { status: ConfirmationLinkProblem };

export type SignUpResult = { email: string; emailSent: boolean };
export type ResendResult = { emailSent: boolean; alreadyConfirmed: boolean };

/** A confirmation-type email to send once its transaction has committed. */
type PendingEmail =
  | { kind: "confirmation"; to: string; displayName: string; token: string }
  | { kind: "account-exists"; to: string; displayName: string };

type Link =
  | { state: "valid" | "expired" | "used"; record: EmailConfirmationToken; user: User }
  | { state: "invalid" };

function linkError(problem: ConfirmationLinkProblem): NotFoundError {
  return new NotFoundError(CONFIRMATION_LINK_MESSAGES[problem]);
}

/**
 * Email and password accounts (accounts Flow 2, AD6, AD7).
 *
 * - **Rate limits first.** Every limiter hit finishes before any business
 *   transaction, per-IP rules before any hashing or comparing; per-IP rules
 *   are skipped when the IP is unknown (`null`).
 * - **Credential locking.** Registration, resend and confirmation lock the
 *   user row (`FOR UPDATE`) before touching its token rows and re-read its
 *   confirmation state under the lock, the same order as the GitHub claim
 *   (AD3), so a confirmed password is never replaced.
 * - **After commit only.** Emails are sent and session cookies set after the
 *   transaction committed, never inside it.
 * - Raw tokens, passwords and hashes are never logged.
 */
export class PasswordAccountService {
  private readonly em: EntityManager;
  private readonly clock: Cradle["clock"];
  private readonly config: Cradle["config"];
  private readonly logger: Cradle["logger"];
  private readonly passwordHasher: Cradle["passwordHasher"];
  private readonly emailSender: Cradle["emailSender"];
  private readonly rateLimiter: Cradle["rateLimiter"];
  private readonly authSessionService: Cradle["authSessionService"];

  constructor({
    em,
    clock,
    config,
    logger,
    passwordHasher,
    emailSender,
    rateLimiter,
    authSessionService,
  }: Pick<
    Cradle,
    "em" | "clock" | "config" | "logger" | "passwordHasher" | "emailSender" | "rateLimiter" | "authSessionService"
  >) {
    this.em = em;
    this.clock = clock;
    this.config = config;
    this.logger = logger;
    this.passwordHasher = passwordHasher;
    this.emailSender = emailSender;
    this.rateLimiter = rateLimiter;
    this.authSessionService = authSessionService;
  }

  /**
   * Registration. The answer is the same for a new, an unconfirmed and a
   * confirmed email, so it never reveals which addresses have accounts:
   *
   * - new: create the user (mentee, unconfirmed) and send a 24-hour link;
   * - unconfirmed: the last registration wins (name and password replaced,
   *   older links deleted, a new link sent);
   * - confirmed: nothing changes (the password was hashed anyway, for timing)
   *   and an "you already have an account" email is sent.
   *
   * Rule 3 (per IP) refuses with 429. Rule 4 (per address) is reserved before
   * any hashing or pending-state change; when it is exhausted nothing is
   * created, changed or sent and the answer is `emailSent: false`.
   */
  async register(input: SignUpInput, ip: string | null): Promise<SignUpResult> {
    const { email } = input;
    if (ip !== null) await this.#limit(PASSWORD_RATE_LIMITS.signUpPerIp, ip);
    const allowance = await this.#hit(PASSWORD_RATE_LIMITS.confirmationEmailPerAddress, email);
    if (!allowance.allowed) return { email, emailSent: false };

    // Hashed before the transaction, which only locks and writes.
    const passwordHash = await this.passwordHasher.hash(input.password);
    const pending = await this.#registerWithRetry(input, passwordHash);
    return { email, emailSent: await this.#send(pending, input.returnTo) };
  }

  /**
   * Password sign-in. A missing or GitHub-only account runs a dummy compare
   * and answers like a wrong password (401). `email_not_confirmed` (403)
   * needs the correct password. Rules 1 and 2 count every attempt.
   */
  async signIn(input: SignInInput, ip: string | null, cookies: ResponseCookies): Promise<{ redirectTo: string }> {
    if (ip !== null) await this.#limit(PASSWORD_RATE_LIMITS.signInPerIp, ip);
    await this.#limit(PASSWORD_RATE_LIMITS.signInPerEmail, input.email);
    const user = await this.#verifyPassword(input.email, input.password);
    if (!user.emailConfirmedAt) throw new EmailNotConfirmedError();
    await this.authSessionService.start(user.id, cookies);
    return { redirectTo: input.returnTo ?? RETURN_TO_FALLBACK };
  }

  /**
   * Sends a new confirmation link to an unconfirmed account whose current
   * password the caller knows, deleting older links. Rule 4 is reserved
   * first (429 when exhausted) and counts failed sends.
   */
  async resendConfirmation(input: SignInInput): Promise<ResendResult> {
    await this.#limit(PASSWORD_RATE_LIMITS.confirmationEmailPerAddress, input.email);
    const user = await this.#verifyPassword(input.email, input.password);
    const alreadyConfirmed = { emailSent: false, alreadyConfirmed: true };
    if (user.emailConfirmedAt) return alreadyConfirmed;

    const pending = await this.em.transactional(async (em): Promise<PendingEmail | null> => {
      const locked = await em.findOne(User, { id: user.id }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      // Re-read under the lock: confirmed or claimed meanwhile, or the
      // password was replaced by a newer registration (no longer current).
      if (locked?.emailConfirmedAt) return null;
      if (!locked || locked.passwordHash !== user.passwordHash) throw new InvalidCredentialsError();
      await em.nativeDelete(EmailConfirmationToken, { user: locked.id });
      return { kind: "confirmation", to: locked.email, displayName: locked.name, token: this.#issueLink(em, locked) };
    }, { clear: true });
    if (!pending) return alreadyConfirmed;
    return { emailSent: await this.#send(pending, input.returnTo), alreadyConfirmed: false };
  }

  /** The state of a confirmation link for the page; reads only, never consumes (AD7). */
  async inspectConfirmation(token: string): Promise<ConfirmationLinkState> {
    const link = await this.#lookup(token);
    return link.state === "valid" ? { status: "valid", email: link.user.email } : { status: link.state };
  }

  /**
   * Confirms the address of a link with the registrant's password (AD7). A
   * wrong password is 401 and consumes nothing. Otherwise one transaction
   * locks the user, consumes the link, sets `emailConfirmedAt` and writes the
   * session; the cookie is set after it commits. An expired, used or invalid
   * link is 404 with its own message. Rules 1 and 2 are the sign-in buckets;
   * the email key comes from the link's account, never from the request.
   */
  async confirmEmail(
    input: EmailConfirmInput,
    ip: string | null,
    cookies: ResponseCookies,
  ): Promise<{ redirectTo: string }> {
    if (ip !== null) await this.#limit(PASSWORD_RATE_LIMITS.signInPerIp, ip);
    const link = await this.#lookup(input.token);
    if (link.state !== "invalid") await this.#limit(PASSWORD_RATE_LIMITS.signInPerEmail, link.user.email);
    if (link.state !== "valid") throw linkError(link.state);

    const { user } = link;
    const passwordHash = user.passwordHash;
    if (!passwordHash) {
      await this.passwordHasher.dummyCompare(input.password);
      throw new InvalidCredentialsError();
    }
    if (!(await this.passwordHasher.compare(input.password, passwordHash))) throw new InvalidCredentialsError();

    const sessionToken = await this.em.transactional(async (em) => {
      const locked = await em.findOne(User, { id: user.id }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      // Re-read under the lock, before the token row.
      if (!locked || locked.email !== link.record.email) throw linkError("invalid");
      if (locked.passwordHash !== passwordHash) throw new InvalidCredentialsError();
      const result = await consumeSingleUseToken(em, EmailConfirmationToken, input.token, this.clock.now());
      if (result.status === "invalid") throw linkError("invalid");
      if (result.status !== "consumed") throw linkError(this.#problem(result.status, locked));
      locked.emailConfirmedAt = this.clock.now();
      return this.authSessionService.create(locked.id, em);
    }, { clear: true });
    this.authSessionService.setCookie(cookies, sessionToken);
    return { redirectTo: input.returnTo ?? RETURN_TO_FALLBACK };
  }

  /** The unique email constraint decides a concurrent insert; the loser retries in a fresh transaction. */
  async #registerWithRetry(input: SignUpInput, passwordHash: string): Promise<PendingEmail> {
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await this.em.transactional((em) => this.#registerOnce(em, input, passwordHash), { clear: true });
      } catch (error) {
        if (!(error instanceof UniqueConstraintViolationException) || attempt >= REGISTER_ATTEMPTS) throw error;
      }
    }
  }

  async #registerOnce(em: EntityManager, input: SignUpInput, passwordHash: string): Promise<PendingEmail> {
    const { email, displayName } = input;
    const user = await em.findOne(User, { email }, { lockMode: LockMode.PESSIMISTIC_WRITE });
    if (!user) {
      const created = em.create(User, { email, name: displayName, passwordHash, emailConfirmedAt: null });
      em.persist([created, em.create(UserRole, { user: created, role: "mentee" })]);
      await em.flush();
      return { kind: "confirmation", to: email, displayName, token: this.#issueLink(em, created) };
    }
    // Confirmed (possibly since this request began): never touch its credentials.
    if (user.emailConfirmedAt) return { kind: "account-exists", to: email, displayName: user.name };
    user.name = displayName;
    user.passwordHash = passwordHash;
    await em.nativeDelete(EmailConfirmationToken, { user: user.id });
    return { kind: "confirmation", to: email, displayName, token: this.#issueLink(em, user) };
  }

  /** Persists a new 24-hour link bound to the user and address; returns the raw token for the email only. */
  #issueLink(em: EntityManager, user: User): string {
    const token = generateToken();
    em.persist(
      em.create(EmailConfirmationToken, {
        user,
        email: user.email,
        tokenHash: hashToken(token),
        expiresAt: new Date(this.clock.now().getTime() + CONFIRMATION_LINK_LIFETIME_HOURS * HOUR_MS),
      }),
    );
    return token;
  }

  /**
   * Finds the account by email and checks the password. Without an account
   * or a password hash, a dummy compare keeps the timing of a real one.
   */
  async #verifyPassword(email: string, password: string): Promise<User> {
    const user = await this.em.findOne(User, { email });
    if (!user?.passwordHash) {
      await this.passwordHasher.dummyCompare(password);
      throw new InvalidCredentialsError();
    }
    if (!(await this.passwordHasher.compare(password, user.passwordHash))) throw new InvalidCredentialsError();
    return user;
  }

  /** A link and its account. A link whose address no longer equals the account's is invalid. */
  async #lookup(token: string): Promise<Link> {
    const lookup = await inspectSingleUseToken(this.em, EmailConfirmationToken, token, this.clock.now());
    if (lookup.status === "invalid") return { state: "invalid" };
    const user = await this.em.findOne(User, { id: lookup.record.user.id });
    if (!user || user.email !== lookup.record.email) return { state: "invalid" };
    const state = this.#linkState(lookup.status, user);
    return state === "invalid" ? { state } : { state, record: lookup.record, user };
  }

  /**
   * Page state from a token status: a used link shows "already confirmed"
   * only while the address is confirmed; a still-valid link to an already
   * confirmed address shows the same.
   */
  #linkState(status: "valid" | "consumed" | "expired" | "used", user: User): "valid" | ConfirmationLinkProblem {
    if (status === "valid") return user.emailConfirmedAt ? "used" : "valid";
    return this.#problem(status, user);
  }

  /**
   * Why a link cannot be used (any status other than a fresh `valid` on the
   * page or `consumed` by this call): expired, or used while the address is
   * confirmed, else invalid.
   */
  #problem(status: "valid" | "consumed" | "expired" | "used", user: User): ConfirmationLinkProblem {
    if (status === "expired") return "expired";
    return user.emailConfirmedAt ? "used" : "invalid";
  }

  async #hit(rule: PasswordRateLimitRule, value: string) {
    return this.rateLimiter.hit(rateLimitKey(rule, value), { limit: rule.limit, windowMs: rule.windowMs });
  }

  async #limit(rule: PasswordRateLimitRule, value: string): Promise<void> {
    const result = await this.#hit(rule, value);
    if (!result.allowed) throw new TooManyRequestsError(result.retryAfterMs);
  }

  /**
   * Sends a committed confirmation-type email. A refused send is reported as
   * `false` (the account and link stay; resend is offered); the vendor error
   * is logged only as a safe summary.
   */
  async #send(pending: PendingEmail, returnTo: string | undefined): Promise<boolean> {
    const appUrl = this.config.app().url;
    const message =
      pending.kind === "confirmation"
        ? emailConfirmationEmail({
          appUrl,
          displayName: pending.displayName,
          token: pending.token,
          returnTo,
          expiresInHours: CONFIRMATION_LINK_LIFETIME_HOURS,
        })
        : accountExistsEmail({ appUrl, displayName: pending.displayName, returnTo });
    try {
      await this.emailSender.send({ to: pending.to, ...message });
      return true;
    } catch (error) {
      if (!(error instanceof EmailSendError)) throw error;
      this.logger.warn("Confirmation-type email was not sent", { kind: pending.kind, cause: summarizeError(error.cause) });
      return false;
    }
  }
}
