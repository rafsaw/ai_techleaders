import { clientIp, parseInput, readJsonBody } from "@devmentor/core";
import { emailConfirmSchema } from "@devmentor/core/validators/auth/email-confirm.schema";

import { apiHandler } from "@/server/http";

// Email confirmation (accounts Flow 2, AD7): the link's token plus the
// registrant's password. Confirms, signs in and answers `{ redirectTo }`.
// The token is in the body, never the URL, so it is not in any log line.
export const POST = apiHandler(
  async ({ req, cradle, cookies }) => {
    const input = parseInput(emailConfirmSchema, await readJsonBody(req));
    return cradle.passwordAccountService.confirmEmail(input, clientIp(req, cradle.config.app()), cookies);
  },
  { access: "public", logRoute: "/api/auth/confirm-email" },
);
