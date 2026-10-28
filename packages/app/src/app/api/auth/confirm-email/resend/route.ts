import { parseInput, readJsonBody } from "@devmentor/core";
import { signInSchema } from "@devmentor/core/validators/auth/sign-in.schema";

import { apiHandler } from "@/server/http";

// Resend confirmation (accounts Flow 2): the same email and password as
// sign-in, so only someone who knows the current password gets a new link.
export const POST = apiHandler(
  async ({ req, cradle }) =>
    cradle.passwordAccountService.resendConfirmation(parseInput(signInSchema, await readJsonBody(req))),
  { access: "public", logRoute: "/api/auth/confirm-email/resend" },
);
