import { z } from "zod";

import { displayNameSchema } from "./account-update.schema";
import { emailSchema } from "./email.schema";
import { passwordSchema } from "./password.schema";
import { optionalReturnToSchema } from "./return-to.schema";

// POST /api/auth/sign-up and the /sign-up form (accounts Flow 2). `returnTo`
// travels only inside the confirmation link, so it is optional and an unsafe
// value is dropped rather than refused.
export const signUpSchema = z.object({
  displayName: displayNameSchema,
  email: emailSchema,
  password: passwordSchema,
  returnTo: optionalReturnToSchema,
});

export type SignUpInput = z.output<typeof signUpSchema>;
