import { isWellFormedToken, readCookie, ResponseCookies } from "@devmentor/core";
import { NextResponse, type NextRequest } from "next/server";

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

// Lazy sections: APP_URL is read only when a session cookie is presented.
const appConfig = createAppConfig();

/** Paths whose responses carry their own cookies or are static resources. */
const EXCLUDED = /^\/(?:api(?:\/|$)|_next\/)|\.[^/]+$/;

export function proxy(request: NextRequest): NextResponse {
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
  // Pages only: no API routes, Next assets or files with an extension.
  matcher: ["/((?!api(?:/|$)|_next/|.*\\.[^/]+$).*)"],
};
