import { isWellFormedToken, readCookie, ResponseCookies } from "@devmentor/core";
import { NextResponse, type NextRequest } from "next/server";

import { TOKEN_PAGE_HEADERS } from "@/app/token-page";
import { presentsSessionCookie, sessionCookie } from "@/server/auth/session-cookie";
import { createAppConfig } from "@/server/config";

// Cookie-only Proxy (platform P4). Server Components cannot set cookies, so
// page requests (documents, RSC navigations, prefetches) get their session
// cookie re-sent here with a fresh 30-day Max-Age.
//
// It never authorizes and never touches the database or the container:
// renewing an unknown, expired or revoked token grants nothing, because the
// page guards and API wrappers validate every request in the DB. APIs renew
// their own cookies (platform P3/P7).
//
// It also issues the trailing-slash 308 (`/sign-in/` -> `/sign-in`) in place
// of Next's own (`skipTrailingSlashRedirect` in next.config.ts; review fix
// R10). Next drops every `headers()` rule on a redirect, so its 308 echoed a
// token page's token in `Location` with none of the platform P8 headers.
// The redirect still decides nothing about identity.

// Lazy sections: APP_URL is read only when a session cookie is presented.
const appConfig = createAppConfig();

/** Paths whose responses carry their own cookies or are static resources. */
const EXCLUDED = /^\/(?:api(?:\/|$)|_next\/)|\.[^/]+$/;

/**
 * The 308 Next would send for a trailing slash, plus `TOKEN_PAGE_HEADERS`.
 * Every such redirect carries them: it echoes the query, which on a token
 * page holds a token, and matching TOKEN_PAGES here would be a second copy of
 * the route list to keep in sync.
 */
function trailingSlashRedirect(request: NextRequest): NextResponse | undefined {
  const { pathname } = request.nextUrl;
  if (pathname === "/" || !pathname.endsWith("/")) return undefined;
  // A plain URL: a NextURL clone would put back the slash it parsed.
  const location = new URL(request.url);
  location.pathname = pathname.replace(/\/+$/, "") || "/";
  const response = NextResponse.redirect(location, 308);
  for (const { key, value } of TOKEN_PAGE_HEADERS) response.headers.set(key, value);
  return response;
}

export function proxy(request: NextRequest): NextResponse {
  const redirect = trailingSlashRedirect(request);
  if (redirect) return redirect;

  const response = NextResponse.next();
  if (EXCLUDED.test(request.nextUrl.pathname) || !presentsSessionCookie(request)) return response;

  let cookie;
  try {
    cookie = sessionCookie(appConfig.app().url);
  } catch {
    // Renewal is best effort; misconfiguration surfaces where identity is
    // checked, and `/error` must still render.
    return response;
  }
  const token = readCookie(request, cookie.name);
  if (token !== undefined && isWellFormedToken(token)) {
    new ResponseCookies().set(cookie.name, token, cookie.options).applyTo(response.headers);
  }
  return response;
}

export const config = {
  // Pages only: no API routes, Next assets or files with an extension; plus
  // every path with a trailing slash, the paths Next's own redirect covered.
  matcher: ["/((?!api(?:/|$)|_next/|.*\\.[^/]+$).*)", "/:path+/"],
};
