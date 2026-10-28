import { z } from "zod";

/** What the invitation page and the accept API say about a link that cannot be used (accounts Flow 3). */
export const INVITATION_INVALID_MESSAGE = "This invitation is not valid";

// POST /api/auth/invitations/accept and the /invite/[token] Accept button
// (accounts Flow 3 step 3): only the link's token. The token is checked by the
// service (an unknown, malformed, used, expired, revoked or rotated one is
// "not valid"); who accepts comes from the session, never from the body.
export const invitationAcceptSchema = z.object({
  token: z.string(INVITATION_INVALID_MESSAGE).min(1, INVITATION_INVALID_MESSAGE).max(256, INVITATION_INVALID_MESSAGE),
});

export type InvitationAcceptInput = z.output<typeof invitationAcceptSchema>;
