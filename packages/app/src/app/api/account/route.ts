import { parseInput, readJsonBody } from "@devmentor/core";
import { accountUpdateSchema } from "@devmentor/core/validators/auth/account-update.schema";

import { apiHandler } from "@/server/http";

// The signed-in person's own account (accounts API Contracts): read it, or
// change the display name. The account is always the caller's, never an id
// from the request.
export const GET = apiHandler(
  ({ cradle, principal }) => cradle.userService.getAccount(principal.userId),
  { access: "user", logRoute: "/api/account" },
);

export const PATCH = apiHandler(
  async ({ req, cradle, principal }) => {
    const { displayName } = parseInput(accountUpdateSchema, await readJsonBody(req));
    return cradle.userService.updateDisplayName(principal.userId, displayName);
  },
  { access: "user", logRoute: "/api/account" },
);
