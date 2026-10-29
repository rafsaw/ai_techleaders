import { z } from "zod";

/** Where every rejected or missing destination goes. */
export const RETURN_TO_FALLBACK = "/";
/** Longest `returnTo` accepted from user input (query string, OAuth cookie, email link). */
export const RETURN_TO_MAX_LENGTH = 512;
/**
 * Longest internal redirect target the server builds from an accepted `returnTo` (platform P7):
 * room for an added flag (`welcome=1`) or for the `returnTo` re-encoded inside an error page's
 * query (`/sign-in?error=…&returnTo=…`, at most three times longer). Only the length differs;
 * every safety rule is the same as for `returnTo`.
 */
export const INTERNAL_REDIRECT_MAX_LENGTH = 2048;

// A fixed base: validation needs no server config. P7 resolves the accepted
// path against `config.app().url` when it redirects.
const BASE = new URL("https://devmentor.invalid");

// Control, format (zero-width, bidi), private-use, unassigned and lone
// surrogate code points, any whitespace, and backslashes (which browsers read
// as `/`).
const FORBIDDEN_CHARS = /[\p{C}\s\\]/u;

// Path roots that are not pages. Matched case-insensitively on the decoded
// first segment, so `/api`, `/api/`, `/API/x` and `/%61pi` are all rejected
// while `/apiary` stays valid.
const RESERVED_ROOTS = new Set(["api", "_next"]);

function decode(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

/**
 * Decodes one path segment, rejecting malformed escapes and anything whose
 * meaning would change if a later layer decoded it again: encoded `/` or `\`,
 * a literal `%` (double encoding), and encoded controls or whitespace.
 */
function decodeSegment(segment: string): string | null {
  const decoded = decode(segment);
  if (decoded === null || /[/%]/.test(decoded) || FORBIDDEN_CHARS.test(decoded)) return null;
  return decoded;
}

/** The P6 rules with a length bound; see `parseReturnTo` and `parseInternalRedirect`. */
function parsePagePath(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string" || value.length > maxLength) return null;
  if (!value.startsWith("/") || FORBIDDEN_CHARS.test(value)) return null;

  const url = new URL(value, BASE);
  // Catches protocol-relative input such as `//evil.example` or `///evil.example`.
  if (url.origin !== BASE.origin) return null;
  // Dot segments can collapse into a protocol-relative result: `/x/..//evil`.
  if (url.pathname.startsWith("//")) return null;

  const segments = url.pathname.split("/").slice(1);
  const decoded = segments.map(decodeSegment);
  if (decoded.includes(null)) return null;
  if (RESERVED_ROOTS.has(decoded[0]!.toLowerCase())) return null;

  if (decode(url.search) === null || decode(url.hash) === null) return null;

  const path = `${url.pathname}${url.search}${url.hash}`;
  return path.length > maxLength ? null : path;
}

/**
 * The normalized same-origin page path for `value`, or `null` when it is
 * missing, unsafe, reserved or longer than 512 characters (platform P6). The
 * result is what the browser would request: dot segments resolved, characters
 * percent-encoded. Use it for every user-supplied destination.
 */
export function parseReturnTo(value: unknown): string | null {
  return parsePagePath(value, RETURN_TO_MAX_LENGTH);
}

/**
 * The same rules for a redirect target the server built from an accepted
 * `returnTo` (platform P7), bounded by `INTERNAL_REDIRECT_MAX_LENGTH` so the
 * added flag or encoding never turns a safe destination into `/`.
 */
export function parseInternalRedirect(value: unknown): string | null {
  return parsePagePath(value, INTERNAL_REDIRECT_MAX_LENGTH);
}

/**
 * Isomorphic `returnTo` field: any input, output always a safe page path.
 * Unsafe, reserved or missing destinations become `/`. The same rule applies
 * to every internal success and error redirect.
 */
export const returnToSchema = z
  .unknown()
  // `.optional()` lets an object omit the key; the output is still a path.
  .optional()
  .transform((value) => parseReturnTo(value) ?? RETURN_TO_FALLBACK);

export type ReturnTo = z.output<typeof returnToSchema>;

/**
 * Like `returnToSchema`, but a missing or unsafe destination becomes
 * `undefined` instead of `/`, for flows that must tell "no destination" apart
 * (a confirmation link carries `returnTo` only when one was given).
 */
export const optionalReturnToSchema = z
  .unknown()
  .optional()
  .transform((value) => parseReturnTo(value) ?? undefined);
