import { z } from "zod";

/** Where every rejected or missing destination goes. */
export const RETURN_TO_FALLBACK = "/";
export const RETURN_TO_MAX_LENGTH = 512;

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

/**
 * The normalized same-origin page path for `value`, or `null` when it is
 * missing, unsafe or reserved (platform P6). The result is what the browser
 * would request: dot segments resolved, characters percent-encoded.
 */
export function parseReturnTo(value: unknown): string | null {
  if (typeof value !== "string" || value.length > RETURN_TO_MAX_LENGTH) return null;
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
  return path.length > RETURN_TO_MAX_LENGTH ? null : path;
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
