import { p } from "@mikro-orm/core";

/**
 * Columns of a single-use token record (platform P9), such as an email
 * confirmation or a mentor invitation. Spread into `defineEntity({ properties })`
 * next to `baseProperties`, and read and consume rows only through
 * `inspectSingleUseToken` / `consumeSingleUseToken`.
 */
export const singleUseTokenProperties = {
  /** SHA-256 hex of the raw token (`hashToken`); the raw token is never stored. */
  tokenHash: p.string().columnType("char(64)").unique(),
  /** The token is expired from this instant on (`expires_at <= now`). */
  expiresAt: p.datetime(),
  /** When the token was used; `null` while it is still unused. */
  consumedAt: p.datetime().nullable(),
};
