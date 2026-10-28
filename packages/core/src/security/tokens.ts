import { createHash, randomBytes } from "node:crypto";

/** Random bytes behind every session, confirmation and invitation token (256 bits). */
export const TOKEN_BYTES = 32;

/**
 * A new opaque secret: 32 bytes from the OS CSPRNG, base64url without padding
 * (43 characters, `[A-Za-z0-9_-]`), so it is safe in cookies, paths and query
 * strings without further encoding. Only its `hashToken` value is ever stored;
 * the raw value must never be logged or persisted (platform P8).
 */
export function generateToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

/** SHA-256 of the token as 64 lowercase hex characters, the stored lookup key. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
