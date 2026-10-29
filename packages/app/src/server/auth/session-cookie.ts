import { readCookie, type CookieDeleteOptions, type CookieOptions } from "@devmentor/core";

// No `server-only` and no container or DB import: the cookie-only Proxy
// (platform P4) reuses these rules to renew the browser cookie.

/** Sessions expire after 30 days without activity; the cookie lives as long. */
export const SESSION_LIFETIME_SECONDS = 30 * 24 * 60 * 60;

const SECURE_NAME = "__Host-devmentor_session";
const PLAIN_NAME = "devmentor_session";

export interface SessionCookie {
  name: string;
  /** Options for setting or renewing the cookie. */
  options: CookieOptions;
  /** Options for clearing it (same path and flags it was set with). */
  deleteOptions: CookieDeleteOptions;
}

/**
 * The session cookie for the app's public origin: `__Host-devmentor_session`
 * with `Secure` when `APP_URL` is https, otherwise `devmentor_session`.
 * HttpOnly, `SameSite=Lax` and `Path=/` are the `ResponseCookies` defaults.
 */
export function sessionCookie(appUrl: URL): SessionCookie {
  const secure = appUrl.protocol === "https:";
  return {
    name: secure ? SECURE_NAME : PLAIN_NAME,
    options: { secure, maxAge: SESSION_LIFETIME_SECONDS },
    deleteOptions: { secure },
  };
}

/**
 * Whether the request (or its headers) carries a session cookie under either name. Lets the
 * resolver answer "signed out" without reading config or the database.
 */
export function presentsSessionCookie(source: Request | Headers): boolean {
  return readCookie(source, SECURE_NAME) !== undefined || readCookie(source, PLAIN_NAME) !== undefined;
}
