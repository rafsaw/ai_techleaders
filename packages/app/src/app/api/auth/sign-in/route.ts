import { clientIp, parseInput, readJsonBody } from "@devmentor/core";
import { signInSchema } from "@devmentor/core/validators/auth/sign-in.schema";

import { apiHandler } from "@/server/http";

// Password sign-in (accounts Flow 2): a session cookie and `{ redirectTo }`;
// the client then navigates with a full page load (platform F5).
export const POST = apiHandler(
  async ({ req, cradle, cookies }) => {
    const input = parseInput(signInSchema, await readJsonBody(req));
    return cradle.passwordAccountService.signIn(input, clientIp(req, cradle.config.app()), cookies);
  },
  { access: "public", logRoute: "/api/auth/sign-in" },
);
