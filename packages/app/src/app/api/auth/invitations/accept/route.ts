import { parseInput, readJsonBody } from "@devmentor/core";
import { invitationAcceptSchema } from "@devmentor/core/validators/auth/invitation-accept.schema";

import { apiHandler } from "@/server/http";

// Mentor invitation acceptance (accounts Flow 3 step 3, AD5): the signed-in
// account accepts the link's token and answers its `AccountDto`, mentor
// included. The token is in the body, never the URL, so it is in no log
// line. The session is not rotated; apiHandler's ordinary P3 renewal sets
// the cookie. The client picks the full-navigation destination.
export const POST = apiHandler(
  async ({ req, cradle, principal }) => {
    const { token } = parseInput(invitationAcceptSchema, await readJsonBody(req));
    return cradle.mentorInvitationService.accept(token, principal);
  },
  { access: "user", logRoute: "/api/auth/invitations/accept" },
);
