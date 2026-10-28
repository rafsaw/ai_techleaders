import { isIP } from "node:net";

export interface ClientIpOptions {
  /** `config.app().trustProxy` (`TRUST_PROXY`): whether a trusted edge sets `X-Forwarded-For`. */
  trustProxy: boolean;
}

/**
 * The caller's IP address, or `null` when it is unknown (platform P11).
 *
 * Next.js route handlers expose no socket address (`NextRequest.ip` was
 * removed in v15), so the only source is `X-Forwarded-For`, and only when
 * `trustProxy` says the edge in front of the app *replaces* that header with
 * one validated client address and direct origin access is blocked. Anything
 * else (no header, a list of hops, a port, brackets, a zone id, padding) is
 * treated as unknown rather than guessed at: the first hop of a list is
 * whatever the client sent. IPv6 is returned in lowercase so one address has
 * one spelling.
 */
export function clientIp(req: Request, { trustProxy }: ClientIpOptions): string | null {
  if (!trustProxy) return null;
  // Repeated header lines arrive joined with ", ", so they fail `isIP` too.
  const value = req.headers.get("x-forwarded-for");
  if (value === null || value.includes("%")) return null;
  const version = isIP(value);
  if (version === 0) return null;
  return version === 6 ? value.toLowerCase() : value;
}
