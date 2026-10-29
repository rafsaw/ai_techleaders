import { RETURN_TO_FALLBACK } from "@devmentor/core/validators/auth/return-to.schema";

import { apiHandler } from "@/server/http";

// Sign-out (accounts "Account and sign-out"): deletes the session row and
// clears the cookie. Signed out already, it only answers the destination, so
// a second click or a stale tab still ends on `/`. The client navigates with
// a full page load only after this succeeds (platform F5).
export const POST = apiHandler(
  async ({ cradle, principal, cookies }) => {
    if (principal) await cradle.authSessionService.end(principal.sessionId, cookies);
    return { redirectTo: RETURN_TO_FALLBACK };
  },
  { access: "optional", logRoute: "/api/auth/sign-out" },
);
