// Links between the public auth pages (accounts Flow 2). Each carries the
// already validated `returnTo` (platform P6), so switching between GitHub,
// sign-in, sign-up and the confirmation pages never loses an invitation or a
// slot. Isomorphic: server pages and client forms build the same URLs.

type SearchValue = string | string[] | undefined;

/** The first of a repeated query parameter, as `/sign-in` already reads `returnTo`. */
export function first(value: SearchValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** `path` with `params` and, when there is one, the validated `returnTo` last. */
export function withReturnTo(path: string, returnTo: string | null | undefined, params: Record<string, string> = {}): string {
  const search = new URLSearchParams(params);
  if (returnTo) search.set("returnTo", returnTo);
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

/**
 * `/sign-up/check-email` after a sign-up (SM-AC3): the address the API answered
 * and, only when the email could not be sent, `sent=0`.
 */
export function checkEmailPath(email: string, emailSent: boolean, returnTo: string | null | undefined): string {
  return withReturnTo("/sign-up/check-email", returnTo, emailSent ? { email } : { email, sent: "0" });
}

/** An invitation needs the address that received it, so sign-up explains that (E01 UI/UX). */
export function isInvitation(returnTo: string | null | undefined): boolean {
  return returnTo?.startsWith("/invite/") ?? false;
}
