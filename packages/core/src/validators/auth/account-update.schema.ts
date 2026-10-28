import { z } from "zod";

/** Longest display name, matching `users.name`. */
export const DISPLAY_NAME_MAX_LENGTH = 100;

// PATCH /api/account and the /account form (accounts API Contracts). The
// display name is what other people see (D15), so it is required.
export const accountUpdateSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Display name is required")
    .max(DISPLAY_NAME_MAX_LENGTH, `Use at most ${DISPLAY_NAME_MAX_LENGTH} characters`),
});

export type AccountUpdateInput = z.output<typeof accountUpdateSchema>;
