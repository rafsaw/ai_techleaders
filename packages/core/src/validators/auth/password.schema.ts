import { z } from "zod";

/** Shortest password, in Unicode code points (accounts AD6). */
export const PASSWORD_MIN_CODE_POINTS = 15;
/** Longest password, in UTF-8 bytes: bcrypt's input limit. Longer input is rejected, never truncated. */
export const PASSWORD_MAX_BYTES = 72;

export const PASSWORD_TOO_SHORT = `Use at least ${PASSWORD_MIN_CODE_POINTS} characters. A short phrase works well`;
export const PASSWORD_TOO_LONG =
  `Use at most ${PASSWORD_MAX_BYTES} bytes. Accented letters and emoji count as 2 to 4 bytes each`;
export const PASSWORD_TOO_COMMON = "This password is too common. Choose a different one";

/**
 * A modest local blocklist (AD6): common passwords and keyboard or number
 * runs that pass the length rule. Compared case-insensitively. Shorter common
 * passwords are already refused by the length rule.
 */
export const COMMON_PASSWORDS: ReadonlySet<string> = new Set([
  "passwordpassword",
  "password1234567",
  "password12345678",
  "password123456789",
  "mypasswordispassword",
  "123456789012345",
  "1234567890123456",
  "12345678901234567890",
  "098765432109876",
  "qwertyuiopasdfg",
  "qwertyuiopasdfgh",
  "qwertyuiopasdfghjkl",
  "qwertyuiop123456",
  "qwertyqwertyqwerty",
  "1q2w3e4r5t6y7u8i",
  "1qaz2wsx3edc4rfv",
  "zaq12wsxcde34rfv",
  "abcdefghijklmno",
  "abcdefghijklmnop",
  "abcdefghijklmnopqrstuvwxyz",
  "iloveyouiloveyou",
  "letmeinletmein1",
  "welcome12345678",
  "administrator123",
  "thequickbrownfox",
  "thequickbrownfoxjumpsoverthelazydog",
  "correcthorsebatterystaple",
  "correct horse battery staple",
  "devmentorpassword",
  "devmentor1234567",
]);

const encoder = new TextEncoder();

/** Code points, not UTF-16 units: "😀" is one character. */
function codePoints(value: string): number {
  return [...value].length;
}

/** UTF-8 length without Node APIs, so the rule is identical in the browser. */
export function utf8Bytes(value: string): number {
  return encoder.encode(value).length;
}

function isCommon(value: string): boolean {
  const lower = value.toLowerCase();
  // One character repeated ("aaaaaaaaaaaaaaa", "111111111111111").
  return COMMON_PASSWORDS.has(lower) || new Set(lower).size === 1;
}

/**
 * A new password (accounts AD6): 15+ code points, at most 72 UTF-8 bytes, not
 * on the blocklist, no composition rules. The value is never trimmed or
 * normalized: what the person typed is what gets hashed. One message at a
 * time, the first rule that fails.
 */
export const passwordSchema = z
  .string("Enter a password")
  .refine((value) => codePoints(value) >= PASSWORD_MIN_CODE_POINTS, { error: PASSWORD_TOO_SHORT, abort: true })
  .refine((value) => utf8Bytes(value) <= PASSWORD_MAX_BYTES, { error: PASSWORD_TOO_LONG, abort: true })
  .refine((value) => !isCommon(value), { error: PASSWORD_TOO_COMMON });

/**
 * A password presented to sign in or confirm. Only presence is checked, so
 * the response never reveals the registration rules; the length cap keeps
 * the request small (the hasher refuses anything over 72 bytes itself).
 */
export const currentPasswordSchema = z
  .string("Enter your password")
  .min(1, "Enter your password")
  .max(1024, "Email or password is incorrect");
