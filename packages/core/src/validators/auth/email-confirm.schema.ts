import { z } from "zod";

import { currentPasswordSchema } from "./password.schema";
import { optionalReturnToSchema } from "./return-to.schema";

// POST /api/auth/confirm-email and the /confirm-email form (accounts Flow 2,
// AD7): the link's token plus the password chosen at registration. The token
// is checked by the service (an unknown or malformed one is "not valid").
export const emailConfirmSchema = z.object({
  token: z.string("This link isn't valid").min(1, "This link isn't valid").max(256, "This link isn't valid"),
  password: currentPasswordSchema,
  returnTo: optionalReturnToSchema,
});

export type EmailConfirmInput = z.output<typeof emailConfirmSchema>;
