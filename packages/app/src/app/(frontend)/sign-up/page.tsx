import { parseReturnTo, RETURN_TO_FALLBACK } from "@devmentor/core/validators/auth/return-to.schema";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { first, isInvitation, returnToPageMetadata, withReturnTo } from "@/app/(frontend)/auth-links";
import { AppSignUpForm } from "@/app/(frontend)/sign-up/sign-up-form";
import { getPrincipal } from "@/server/auth/page-guards";

type SearchParams = Record<string, string | string[] | undefined>;

// From an invitation, `returnTo` carries its token: no referrer, no indexing then.
export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }): Promise<Metadata> {
  return returnToPageMetadata("Create an account", parseReturnTo(first((await searchParams).returnTo)));
}

/**
 * /sign-up (accounts Flow 2): display name, email and password, with the
 * N03 notice and the password rule before typing. The validated `returnTo`
 * goes into the confirmation link and the "Sign in instead" link; from an
 * invitation the page says which address to use. Signed in already, it goes
 * to `returnTo`, like /sign-in (SM-AC1).
 */
export default async function SignUpPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const returnTo = parseReturnTo(first(params.returnTo));
  if (await getPrincipal()) redirect(returnTo ?? RETURN_TO_FALLBACK);

  return (
    <main className="mx-auto w-full max-w-content px-page-gutter py-section">
      <div className="flex max-w-text flex-col gap-component">
        <h1 className="text-page-title">Create an account</h1>
        <AppSignUpForm signInHref={withReturnTo("/sign-in", returnTo)} returnTo={returnTo} invited={isInvitation(returnTo)} />
      </div>
    </main>
  );
}
