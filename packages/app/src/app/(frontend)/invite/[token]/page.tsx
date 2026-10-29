import { parseReturnTo } from "@devmentor/core/validators/auth/return-to.schema";
import type { Metadata } from "next";

import { AppInvitationPanel } from "@/app/(frontend)/invite/[token]/invitation-panel";
import { TOKEN_PAGE_METADATA } from "@/app/token-page";
import { getPrincipal } from "@/server/auth/page-guards";
import { createRequestScope } from "@/server/container";

// The token is in this page's address: no referrer, no indexing
// (next.config.ts also sends the token-page response headers for the route).
export const metadata: Metadata = { title: "Mentor invitation", ...TOKEN_PAGE_METADATA };

/**
 * /invite/[token] (accounts Flow 3 step 2, AD5). The GET only inspects the
 * invitation, so a mail scanner changes nothing; nothing here consumes it or
 * grants a role. The page shows one of the five Flow 3 states for the
 * visitor's session. Only the valid state hands the token to the client (for
 * Accept); the sign-in, sign-up and switch-account paths carry this page's
 * validated path as `returnTo`.
 */
export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const principal = await getPrincipal();
  const state = await createRequestScope().cradle.mentorInvitationService.inspect(token, principal);
  // Only a well-formed, usable token gets past `invalid`, so this path is safe and short.
  const invitationPath = state.status === "invalid" ? null : parseReturnTo(`/invite/${token}`);

  return (
    <main className="mx-auto w-full max-w-content px-page-gutter py-section">
      <div className="flex max-w-text flex-col gap-component">
        <h1 className="text-page-title">Mentor invitation</h1>
        <AppInvitationPanel
          state={state}
          token={state.status === "valid" ? token : undefined}
          invitationPath={invitationPath}
        />
      </div>
    </main>
  );
}
