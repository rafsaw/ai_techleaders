"use client";

import { invitationAcceptSchema } from "@devmentor/core/validators/auth/invitation-accept.schema";
import { apiCall } from "@devmentor/ui/api/apiCall";
import { InvitationPanel, type InvitationState } from "@devmentor/ui/components/auth/InvitationPanel";
import { z } from "zod";

import { INVITATION_ACCEPTED_DESTINATION, withReturnTo } from "@/app/(frontend)/auth-links";
import { navigateFully } from "@/app/full-navigation";
import type { InvitationPageState } from "@/server/services/auth/mentor-invitation.service";

// Sign-out posts no body.
const noBody = z.object({});

export interface AppInvitationPanelProps {
  state: InvitationPageState;
  /** The link's token; the page passes it only in the valid state. */
  token?: string;
  /** This page's validated path (`/invite/<token>`), the `returnTo` of every way back here. */
  invitationPath: string | null;
}

/**
 * /invite/[token] (accounts Flow 3): the server's page state wired to the
 * API. **Accept invitation** posts the token; only success fully navigates
 * (platform F5), so headers and layouts show mentor at once. The
 * switch-account **Sign out** waits for success and then fully navigates back
 * to this same invitation, signed out (Account and sign-out). Failures stay
 * on the page with the server's message.
 */
export function AppInvitationPanel({ state, token, invitationPath }: AppInvitationPanelProps) {
  return <InvitationPanel state={toPanelState(state, token, invitationPath)} />;
}

function toPanelState(state: InvitationPageState, token: string | undefined, invitationPath: string | null): InvitationState {
  switch (state.status) {
    case "signed-out":
      return {
        status: "signed-out",
        signInHref: withReturnTo("/sign-in", invitationPath),
        signUpHref: withReturnTo("/sign-up", invitationPath),
      };
    case "mismatch":
      return {
        status: "mismatch",
        currentEmail: state.currentEmail,
        signOut: {
          schema: noBody,
          values: {},
          submit: (_values, { signal }) => apiCall("/api/auth/sign-out", { method: "POST", signal }),
          onDone: () => navigateFully(invitationPath),
        },
      };
    case "valid":
      return {
        status: "valid",
        displayName: state.displayName,
        email: state.email,
        accept: {
          schema: invitationAcceptSchema,
          values: { token: token ?? "" },
          submit: (body, { signal }) => apiCall("/api/auth/invitations/accept", { method: "POST", body, signal }),
          onDone: () => navigateFully(INVITATION_ACCEPTED_DESTINATION),
        },
      };
    default:
      return state;
  }
}
