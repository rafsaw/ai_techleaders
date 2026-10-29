import { returnToSchema } from "@devmentor/core/validators/auth/return-to.schema";
import type { ApiResult } from "@devmentor/ui/api/types";

import { navigateFully } from "@/app/full-navigation";

/**
 * Sign-in with `returnTo`. When a presented session was rejected (expired or
 * deleted), `error=session_expired` makes the sign-in page say so (SM-AC2).
 * Isomorphic: the page guards redirect to it and clients navigate to it.
 */
export function signInPath(returnTo: string, sessionExpired = false): string {
  const params = new URLSearchParams();
  if (sessionExpired) params.set("error", "session_expired");
  params.set("returnTo", returnToSchema.parse(returnTo));
  return `/sign-in?${params.toString()}`;
}

/**
 * Passes an API result through, unless the API answered 401: then the
 * database session has expired, so the browser fully navigates to sign-in
 * with the session-expired banner and `returnTo` (SM-AC2), and the returned
 * promise never settles, leaving the page as it is until the browser leaves.
 * Unsaved input is discarded. Other failures, including 403, pass through.
 */
export async function unlessSessionExpired<T>(result: ApiResult<T>, returnTo: string): Promise<ApiResult<T>> {
  if (result.ok || result.error.code !== "unauthorized") return result;
  navigateFully(signInPath(returnTo, true));
  return new Promise<never>(() => {});
}
