import { clientIp, parseInput, readJsonBody } from "@devmentor/core";
import { signUpSchema } from "@devmentor/core/validators/auth/sign-up.schema";

import { apiHandler } from "@/server/http";

// Email registration (accounts Flow 2). 201 with the same body for new,
// unconfirmed and confirmed addresses; 429 only from the per-IP rule.
export const POST = apiHandler(
  async ({ req, cradle }) => {
    const input = parseInput(signUpSchema, await readJsonBody(req));
    return cradle.passwordAccountService.register(input, clientIp(req, cradle.config.app()));
  },
  { access: "public", status: 201, logRoute: "/api/auth/sign-up" },
);
