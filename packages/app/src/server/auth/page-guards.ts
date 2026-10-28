import "server-only";

import { readCookie, type Principal } from "@devmentor/core";
import { returnToSchema } from "@devmentor/core/validators/auth/return-to.schema";
import type { Role } from "@devmentor/core/validators/auth/role.schema";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import { presentsSessionCookie, sessionCookie } from "@/server/auth/session-cookie";
import { createRequestScope } from "@/server/container";

// Page guards, the data access layer for Server Components (platform P4).
//
// - Every leaf page except the identity-free `/error` calls `getPrincipal()`
//   or a guard, so each page request reaching the server (document, RSC
//   navigation, prefetch) validates the session in the DB and records
//   activity. Layouts alone are not enough: they are reused on client
//   navigation.
// - React `cache()` deduplicates the lookup within one render only. Nothing
//   is cached across requests, so role changes apply on the next request.
// - Pages cannot set cookies; the Proxy (`src/proxy.ts`) renews the browser
//   cookie. Renewal grants nothing: validity is always decided here, in the DB.

interface SessionLookup {
  principal: Principal | null;
  /** A session cookie for this origin was presented, whether or not it was still valid. */
  presented: boolean;
}

/**
 * Resolves this request's session once per render. Without a session cookie
 * it touches neither config nor the database. Reading request headers makes
 * the page render dynamically, at request time.
 */
const lookUpSession = cache(async (): Promise<SessionLookup> => {
  const requestHeaders = await headers();
  if (!presentsSessionCookie(requestHeaders)) return { principal: null, presented: false };
  const { cradle } = createRequestScope();
  const token = readCookie(requestHeaders, sessionCookie(cradle.config.app().url).name);
  // A cookie under the other scheme's name was never issued for this origin.
  if (token === undefined) return { principal: null, presented: false };
  return { principal: await cradle.authSessionService.resolveToken(token), presented: true };
});

/** The signed-in principal for this request, or null. */
export async function getPrincipal(): Promise<Principal | null> {
  return (await lookUpSession()).principal;
}

export interface GuardOptions {
  /** The page path to come back to after sign-in; unsafe values become `/`. */
  returnTo: string;
}

/**
 * Sign-in with `returnTo`. When the request presented a session the database
 * rejected (expired or deleted), `error=session_expired` makes the sign-in
 * page say so (SM-AC2).
 */
export function signInPath(returnTo: string, sessionExpired = false): string {
  const params = new URLSearchParams();
  if (sessionExpired) params.set("error", "session_expired");
  params.set("returnTo", returnToSchema.parse(returnTo));
  return `/sign-in?${params.toString()}`;
}

/** The signed-in principal; signed out, redirects to sign-in with `returnTo`. */
export async function requirePrincipal({ returnTo }: GuardOptions): Promise<Principal> {
  const { principal, presented } = await lookUpSession();
  if (!principal) redirect(signInPath(returnTo, presented));
  return principal;
}

/**
 * A signed-in principal holding `role`. Signed out redirects to sign-in;
 * a missing role answers 404 (`forbidden()` needs an experimental flag, and
 * a 404 also conceals the area).
 */
export async function requireRole(role: Role, options: GuardOptions): Promise<Principal> {
  const principal = await requirePrincipal(options);
  if (!principal.roles.includes(role)) notFound();
  return principal;
}
