import { z } from "zod";

import { emailSchema } from "./email.schema";
import { currentPasswordSchema } from "./password.schema";
import { optionalReturnToSchema } from "./return-to.schema";

// POST /api/auth/sign-in, POST /api/auth/confirm-email/resend and the
// /sign-in email form (accounts Flow 2). Resend re-posts the same fields, so
// only someone who knows the current password can trigger a new link; its
// `returnTo` goes into that link.
export const signInSchema = z.object({
  email: emailSchema,
  password: currentPasswordSchema,
  returnTo: optionalReturnToSchema,
});

export type SignInInput = z.output<typeof signInSchema>;
