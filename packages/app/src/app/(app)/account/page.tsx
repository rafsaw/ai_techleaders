import { AccountSummary } from "@devmentor/ui/components/auth/AccountSummary";
import type { Metadata } from "next";

import { requirePrincipal } from "@/server/auth/page-guards";
import { createRequestScope } from "@/server/container";

import { AccountNameForm } from "./account-name-form";
import { ForgetWelcome } from "./forget-welcome";

export const metadata: Metadata = { title: "Account" };

type SearchParams = Record<string, string | string[] | undefined>;

/**
 * /account (accounts "Account and sign-out", platform F5): reads the account
 * on the server, writes the display name through PATCH /api/account. The
 * first GitHub sign-in lands on `?welcome=1`, which shows a one-time notice;
 * the flag is then dropped from the address, so a reload does not show it
 * again (SM-AC7).
 */
export default async function AccountPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const principal = await requirePrincipal({ returnTo: "/account" });
  const account = await createRequestScope().cradle.userService.getAccount(principal.userId);
  const welcome = (await searchParams).welcome === "1";
  return (
    <main className="mx-auto w-full max-w-content px-page-gutter py-section">
      <div className="flex max-w-text flex-col gap-component">
        <h1 className="text-page-title">Account</h1>
        <AccountSummary email={account.email} roles={account.roles} signInMethods={account.signInMethods} welcome={welcome}>
          <AccountNameForm displayName={account.displayName} />
        </AccountSummary>
        {welcome ? <ForgetWelcome /> : null}
      </div>
    </main>
  );
}
