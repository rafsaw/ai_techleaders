import { isIP } from "node:net";

export interface ClientIpOptions {
  /** `config.app().trustProxy` (`TRUST_PROXY`): whether a trusted edge sets `X-Forwarded-For`. */
  trustProxy: boolean;
}

/**
 * The caller's IP address in canonical form, or `null` when it is unknown
 * (platform P11).
 *
 * Next.js route handlers expose no socket address (`NextRequest.ip` was
 * removed in v15), so the only source is `X-Forwarded-For`, and only when
 * `trustProxy` says the edge in front of the app *replaces* that header with
 * one validated client address and direct origin access is blocked. Anything
 * else (no header, a list of hops, a port, brackets, a zone id, padding) is
 * treated as unknown rather than guessed at: the first hop of a list is
 * whatever the client sent.
 *
 * One address has one spelling, because callers use the value as a
 * rate-limit key: IPv6 is returned in its RFC 5952 form (lowercase, no
 * leading zeros, the longest run of two or more zero groups as `::`, embedded
 * IPv4 in hex), and an IPv4-mapped address (`::ffff:0:0/96`) as plain dotted
 * IPv4. IPv4 is returned as received (`isIP` already refuses leading zeros).
 */
export function clientIp(req: Request, { trustProxy }: ClientIpOptions): string | null {
  if (!trustProxy) return null;
  // Repeated header lines arrive joined with ", ", so they fail `isIP` too.
  const value = req.headers.get("x-forwarded-for");
  if (value === null || value.includes("%")) return null;
  const version = isIP(value);
  if (version === 0) return null;
  return version === 6 ? canonicalIpv6(value) : value;
}

/**
 * The WHATWG URL serializer compresses IPv6 exactly as RFC 5952 asks (and
 * rewrites a dotted IPv4 tail in hex), so it does the canonicalization for
 * `isIP`-validated input; `::ffff:0:0/96` is then unmapped to IPv4.
 */
function canonicalIpv6(address: string): string {
  const canonical = new URL(`http://[${address}]`).hostname.slice(1, -1);
  const mapped = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(canonical);
  if (mapped === null) return canonical;
  const high = Number.parseInt(mapped[1]!, 16);
  const low = Number.parseInt(mapped[2]!, 16);
  return [high >> 8, high & 0xff, low >> 8, low & 0xff].join(".");
}
