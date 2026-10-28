import { timingSafeEqual } from "node:crypto";

import {
  AppError,
  generateToken,
  readCookie,
  summarizeError,
  type Cradle,
  type ResponseCookies,
} from "@devmentor/core";
import { parseReturnTo } from "@devmentor/core/validators/auth/return-to.schema";
import { LockMode, UniqueConstraintViolationException, User, UserRole, type EntityManager } from "@devmentor/db";
import { z } from "zod";

import {
  GitHubOAuthError,
  type GitHubIdentity,
} from "@/server/services/auth/github-oauth.port";

/** Short-lived cookie binding the browser to its OAuth attempt (state, PKCE verifier, returnTo). */
export const OAUTH_COOKIE = "devmentor_oauth";
/** Sent only to the start and callback routes. */
export const OAUTH_COOKIE_PATH = "/api/auth/github";
/** GitHub codes expire after 10 minutes; the attempt does too. */
export const OAUTH_COOKIE_MAX_AGE_SECONDS = 10 * 60;

/** Where a new account lands when sign-in started without a `returnTo`. */
export const WELCOME_PATH = "/account?welcome=1";

const NAME_MAX_LENGTH = 100;
// Two attempts: the second sees the row a concurrent sign-in committed.
const RESOLVE_ATTEMPTS = 2;

export type GitHubSignInErrorCode =
  | "github_cancelled"
  | "github_failed"
  | "github_no_verified_email"
  | "github_email_taken";

const MESSAGES: Record<GitHubSignInErrorCode, string> = {
  github_cancelled: "GitHub sign-in was cancelled",
  github_failed: "GitHub sign-in failed",
  github_no_verified_email: "The GitHub account has no verified primary email",
  github_email_taken: "An account with this email is linked to a different GitHub account",
};

/**
 * A recoverable sign-in failure. It carries the attempt's validated `returnTo`
 * so the sign-in page can keep it for retry or the email option.
 */
export class GitHubSignInError extends AppError {
  constructor(
    code: GitHubSignInErrorCode,
    readonly returnTo: string | null,
    options?: ErrorOptions,
  ) {
    super(MESSAGES[code], code, code === "github_email_taken" ? 409 : 400, options);
  }
}

/**
 * Recognized by its code, not `instanceof`: the callback route may load a
 * different copy of this module than the container that threw (see
 * `isAppError` in core).
 */
function isGitHubSignInError(error: AppError): error is GitHubSignInError {
  return Object.hasOwn(MESSAGES, error.code);
}

/**
 * The sign-in page for a failed callback: `/sign-in?error=<code>` plus the
 * validated `returnTo` when the attempt had one. Any other error is reported
 * as `github_failed`.
 */
export function signInErrorPath(error: AppError): string {
  const query = new URLSearchParams();
  if (isGitHubSignInError(error)) {
    query.set("error", error.code);
    if (error.returnTo) query.set("returnTo", error.returnTo);
  } else {
    query.set("error", "github_failed");
  }
  return `/sign-in?${query.toString()}`;
}

const attemptSchema = z.object({
  state: z.string().min(1),
  verifier: z.string().min(1),
  returnTo: z.string().nullable(),
});

type Attempt = z.output<typeof attemptSchema>;

function encodeAttempt(attempt: Attempt): string {
  return Buffer.from(JSON.stringify(attempt), "utf8").toString("base64url");
}

function decodeAttempt(value: string | undefined): Attempt | null {
  if (value === undefined) return null;
  try {
    const parsed = attemptSchema.safeParse(JSON.parse(Buffer.from(value, "base64url").toString("utf8")));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** A safe page path to come back to, or null when there is none worth keeping. */
function safeReturnTo(value: unknown): string | null {
  const path = parseReturnTo(value);
  return path === "/" ? null : path;
}

function sameSecret(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Adds the one-time `welcome=1` notice flag to an internal path (SM-AC7). */
function withWelcome(path: string): string {
  const url = new URL(path, "https://devmentor.invalid");
  url.searchParams.set("welcome", "1");
  return `${url.pathname}${url.search}${url.hash}`;
}

/** The display name for a new account: GitHub name, else login, at most 100 characters. */
export function initialDisplayName(identity: Pick<GitHubIdentity, "login" | "name">): string {
  const name = identity.name?.trim() || identity.login;
  return [...name].slice(0, NAME_MAX_LENGTH).join("");
}

type Resolution = { userId: string; created: boolean };

/**
 * GitHub sign-in (accounts Flow 1, AD3). `begin` starts an OAuth attempt;
 * `complete` handles every callback outcome, resolves the account and starts
 * a session.
 *
 * Phase 2 adds the claim rule (an unconfirmed password is discarded when
 * GitHub links its account); until then no account has a password.
 */
export class GitHubSignInService {
  private readonly em: EntityManager;
  private readonly clock: Cradle["clock"];
  private readonly config: Cradle["config"];
  private readonly logger: Cradle["logger"];
  private readonly githubOAuth: Cradle["githubOAuth"];
  private readonly authSessionService: Cradle["authSessionService"];

  constructor({
    em,
    clock,
    config,
    logger,
    githubOAuth,
    authSessionService,
  }: Pick<Cradle, "em" | "clock" | "config" | "logger" | "githubOAuth" | "authSessionService">) {
    this.em = em;
    this.clock = clock;
    this.config = config;
    this.logger = logger;
    this.githubOAuth = githubOAuth;
    this.authSessionService = authSessionService;
  }

  /**
   * Starts an attempt: a fresh `state` and PKCE verifier plus the validated
   * `returnTo` go into the OAuth cookie, and the GitHub authorization URL is
   * returned for an external redirect.
   */
  begin(returnTo: unknown, cookies: ResponseCookies): URL {
    const attempt: Attempt = { state: generateToken(), verifier: generateToken(), returnTo: safeReturnTo(returnTo) };
    const url = this.githubOAuth.authorizationUrl(attempt.state, attempt.verifier);
    cookies.set(OAUTH_COOKIE, encodeAttempt(attempt), {
      ...this.#cookieFlags(),
      maxAge: OAUTH_COOKIE_MAX_AGE_SECONDS,
    });
    return url;
  }

  /**
   * Handles GitHub's callback. The OAuth cookie is cleared first, so every
   * terminal outcome, success or failure, removes it. The state binding is
   * checked before success or denial. Failures throw `GitHubSignInError`.
   */
  async complete(query: URLSearchParams, req: Request, cookies: ResponseCookies): Promise<{ redirectTo: string }> {
    const attempt = decodeAttempt(readCookie(req, OAUTH_COOKIE));
    cookies.delete(OAUTH_COOKIE, this.#cookieFlags());
    const returnTo = safeReturnTo(attempt?.returnTo);
    const fail = (code: GitHubSignInErrorCode, cause?: unknown) =>
      new GitHubSignInError(code, returnTo, cause === undefined ? undefined : { cause });

    const state = query.get("state");
    if (!attempt || !state || !sameSecret(state, attempt.state)) throw fail("github_failed");
    const providerError = query.get("error");
    if (providerError === "access_denied") throw fail("github_cancelled");
    const code = query.get("code");
    if (providerError || !code) throw fail("github_failed");

    let identity: GitHubIdentity;
    try {
      const accessToken = await this.githubOAuth.exchangeCode(code, attempt.verifier);
      identity = await this.githubOAuth.fetchIdentity(accessToken);
    } catch (error) {
      if (!(error instanceof GitHubOAuthError)) throw error;
      // The vendor error stays out of the log: its message can embed URLs.
      this.logger.warn("GitHub sign-in failed at the provider", { cause: summarizeError(error.cause) });
      throw fail("github_failed", error);
    }

    const primary = identity.emails.find((email) => email.primary && email.verified);
    if (!primary) throw fail("github_no_verified_email");
    const email = primary.email.trim().toLowerCase();

    const { userId, created } = await this.#resolve(identity, email, fail);
    await this.authSessionService.start(userId, cookies);
    if (!created) return { redirectTo: returnTo ?? "/" };
    return { redirectTo: returnTo ? withWelcome(returnTo) : WELCOME_PATH };
  }

  /**
   * Account resolution in one transaction (AD3). The unique `github_id` and
   * `email` constraints decide concurrent inserts; the loser retries in a
   * fresh transaction and finds the winner's row.
   */
  async #resolve(
    identity: GitHubIdentity,
    email: string,
    fail: (code: GitHubSignInErrorCode) => GitHubSignInError,
  ): Promise<Resolution> {
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await this.em.transactional((em) => this.#resolveOnce(em, identity, email, fail), { clear: true });
      } catch (error) {
        if (!(error instanceof UniqueConstraintViolationException) || attempt >= RESOLVE_ATTEMPTS) throw error;
      }
    }
  }

  async #resolveOnce(
    em: EntityManager,
    identity: GitHubIdentity,
    email: string,
    fail: (code: GitHubSignInErrorCode) => GitHubSignInError,
  ): Promise<Resolution> {
    // 1. A known GitHub identity: reuse it and keep the (maybe edited) name.
    const linked = await em.findOne(User, { githubId: identity.id });
    if (linked) return { userId: linked.id, created: false };

    // 2. An account with the verified primary email. Locked like every
    // credential change (registration, confirmation) so they serialize.
    const existing = await em.findOne(User, { email }, { lockMode: LockMode.PESSIMISTIC_WRITE });
    if (existing) {
      if (existing.githubId != null && existing.githubId !== identity.id) throw fail("github_email_taken");
      existing.githubId = identity.id;
      existing.emailConfirmedAt ??= this.clock.now();
      return { userId: existing.id, created: false };
    }

    // 3. A new account holding mentee.
    const user = em.create(User, {
      email,
      name: initialDisplayName(identity),
      githubId: identity.id,
      emailConfirmedAt: this.clock.now(),
    });
    em.persist([user, em.create(UserRole, { user, role: "mentee" })]);
    await em.flush();
    return { userId: user.id, created: true };
  }

  #cookieFlags() {
    return { secure: this.config.app().url.protocol === "https:", path: OAUTH_COOKIE_PATH };
  }
}
