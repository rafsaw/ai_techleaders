import { z } from "zod";

/** Longest display name, matching `users.name`. */
export const DISPLAY_NAME_MAX_LENGTH = 100;

/** The display name, which other people see (D15): required, trimmed, 1–100 characters. */
export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Display name is required")
  .max(DISPLAY_NAME_MAX_LENGTH, `Use at most ${DISPLAY_NAME_MAX_LENGTH} characters`);

// PATCH /api/account and the /account form (accounts API Contracts).
export const accountUpdateSchema = z.object({ displayName: displayNameSchema });

export type AccountUpdateInput = z.output<typeof accountUpdateSchema>;
