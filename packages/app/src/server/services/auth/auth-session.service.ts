import {
  generateToken,
  hashToken,
  isWellFormedToken,
  readCookie,
  type Cradle,
  type Principal,
  type PrincipalResolver,
  type ResponseCookies,
} from "@devmentor/core";
import { AuthSession, type EntityManager } from "@devmentor/db";

import { presentsSessionCookie, SESSION_LIFETIME_SECONDS, sessionCookie } from "@/server/auth/session-cookie";

/** A session expires this long after its last recorded activity. */
export const SESSION_LIFETIME_MS = SESSION_LIFETIME_SECONDS * 1000;
/** DB expiry is moved at most once per this interval (activity throttle). */
export const SESSION_TOUCH_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Database sessions (accounts AD2, platform P3). Decides who is calling on
 * every request; registered as the cradle's `principalResolver`.
 *
 * - Only the SHA-256 of the cookie token is stored.
 * - Each valid lookup moves `expires_at` to request time + 30 days, but skips
 *   the write when expiry was already moved within the last hour, so most
 *   requests are read-only. The update is conditional: it never shortens
 *   expiry, extends an expired row or recreates a deleted one.
 * - Roles are read live, so role changes apply on the next request.
 */
export class AuthSessionService implements PrincipalResolver {
  private readonly em: EntityManager;
  private readonly clock: Cradle["clock"];
  private readonly roleService: Cradle["roleService"];
  private readonly config: Cradle["config"];

  constructor({ em, clock, roleService, config }: Pick<Cradle, "em" | "clock" | "roleService" | "config">) {
    this.em = em;
    this.clock = clock;
    this.roleService = roleService;
    this.config = config;
  }

  /** Starts a session for `userId` and sets its cookie (overriding any renewal). */
  async start(userId: string, cookies: ResponseCookies): Promise<void> {
    this.setCookie(cookies, await this.create(userId));
  }

  /**
   * Writes a session row for `userId` through `em` and returns its raw token
   * without setting a cookie. Pass a transaction's `em` when the session must
   * commit together with other work (email confirmation), then call
   * `setCookie` only after that transaction committed.
   */
  async create(userId: string, em: EntityManager = this.em): Promise<string> {
    const token = generateToken();
    const session = em.create(AuthSession, {
      user: userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(this.clock.now().getTime() + SESSION_LIFETIME_MS),
    });
    await em.persist(session).flush();
    return token;
  }

  /** Sets the session cookie for a raw token from `create` (overriding any renewal). */
  setCookie(cookies: ResponseCookies, token: string): void {
    const cookie = this.#cookie();
    cookies.set(cookie.name, token, cookie.options);
  }

  /**
   * Resolves the request's session cookie. Without one it returns null and
   * touches neither config nor the database. A valid session renews the
   * cookie; an unknown or expired one clears it.
   */
  async resolve(req: Request, cookies: ResponseCookies): Promise<Principal | null> {
    if (!presentsSessionCookie(req)) return null;
    const cookie = this.#cookie();
    const token = readCookie(req, cookie.name);
    // A cookie under the other scheme's name was never issued for this origin.
    if (token === undefined) return null;
    const principal = await this.resolveToken(token);
    if (principal) cookies.set(cookie.name, token, cookie.options);
    else cookies.delete(cookie.name, cookie.deleteOptions);
    return principal;
  }

  /**
   * Validates a raw session token and records activity (throttled DB touch).
   * Cookie renewal is the caller's job (API wrappers via `resolve`, pages via
   * the Proxy). An expired row is deleted; expiry at exactly now is expired.
   */
  async resolveToken(token: string): Promise<Principal | null> {
    if (!isWellFormedToken(token)) return null;
    const now = this.clock.now();
    const session = await this.em.findOne(
      AuthSession,
      { tokenHash: hashToken(token) },
      { populate: ["user"] },
    );
    if (!session) return null;
    if (session.expiresAt.getTime() <= now.getTime()) {
      await this.em.nativeDelete(AuthSession, { id: session.id, expiresAt: { $lte: now } });
      return null;
    }
    const roles = await this.roleService.rolesOf(session.user.id);
    await this.#touch(session, now);
    return {
      userId: session.user.id,
      sessionId: session.id,
      displayName: session.user.name,
      roles,
    };
  }

  /** Ends a session (sign-out): deletes its row and clears the cookie. */
  async end(sessionId: string, cookies: ResponseCookies): Promise<void> {
    await this.em.nativeDelete(AuthSession, { id: sessionId });
    const cookie = this.#cookie();
    cookies.delete(cookie.name, cookie.deleteOptions);
  }

  /**
   * Moves expiry to `now + 30 days` unless it was moved less than an hour
   * ago (expiry later than `now + 30 days − 1 hour`). The conditions keep the
   * write monotonic and limited to a live, unexpired row.
   */
  async #touch(session: AuthSession, now: Date): Promise<void> {
    const expiresAt = new Date(now.getTime() + SESSION_LIFETIME_MS);
    const touchedBefore = new Date(expiresAt.getTime() - SESSION_TOUCH_INTERVAL_MS);
    if (session.expiresAt.getTime() > touchedBefore.getTime()) return;
    await this.em.nativeUpdate(
      AuthSession,
      { id: session.id, expiresAt: { $gt: now, $lte: touchedBefore } },
      { expiresAt, updatedAt: now },
    );
  }

  #cookie() {
    return sessionCookie(this.config.app().url);
  }
}
