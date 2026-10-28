import { z } from "zod";

/** Longest email address accepted (RFC 5321 path limit), matching the account and invitation columns. */
export const EMAIL_MAX_LENGTH = 254;

/**
 * An account email, normalized (trimmed, lower-cased) so the unique index is
 * case-insensitive and rate-limit keys have one spelling per address.
 */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(EMAIL_MAX_LENGTH)
  .pipe(z.email("Enter a valid email address"));
