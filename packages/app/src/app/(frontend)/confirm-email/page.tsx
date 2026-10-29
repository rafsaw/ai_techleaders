import { parseReturnTo } from "@devmentor/core/validators/auth/return-to.schema";
import type { ConfirmEmailState } from "@devmentor/ui/components/auth/ConfirmEmailPanel";
import type { Metadata } from "next";

import { first, withReturnTo } from "@/app/(frontend)/auth-links";
import { AppConfirmEmailForm } from "@/app/(frontend)/confirm-email/confirm-email-form";
import { TOKEN_PAGE_METADATA } from "@/app/token-page";
import { getPrincipal } from "@/server/auth/page-guards";
import { createRequestScope } from "@/server/container";

// The token is in this page's address: no referrer, no indexing
// (next.config.ts also sends the token-page response headers for the route).
export const metadata: Metadata = { title: "Confirm your email", ...TOKEN_PAGE_METADATA };

type SearchParams = Record<string, string | string[] | undefined>;

/**
 * /confirm-email?token=…&returnTo=… (accounts Flow 2, AD7). The GET only
 * inspects the token, so a mail scanner changes nothing; the page shows one
 * of the four link states. Only a valid link gets the password form, and only
 * then is the token handed to the client. Shown to signed-in visitors too:
 * confirming signs in as the registered account.
 */
export default async function ConfirmEmailPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  await getPrincipal();
  const token = first(params.token);
  const returnTo = parseReturnTo(first(params.returnTo));
  const state: ConfirmEmailState = token
    ? await createRequestScope().cradle.passwordAccountService.inspectConfirmation(token)
    : { status: "invalid" };

  return (
    <main className="mx-auto w-full max-w-content px-page-gutter py-section">
      <div className="flex max-w-text flex-col gap-component">
        <h1 className="text-page-title">Confirm your email</h1>
        <AppConfirmEmailForm
          state={state}
          token={state.status === "valid" ? token : undefined}
          returnTo={returnTo}
          signInHref={withReturnTo("/sign-in", returnTo)}
        />
      </div>
    </main>
  );
}
