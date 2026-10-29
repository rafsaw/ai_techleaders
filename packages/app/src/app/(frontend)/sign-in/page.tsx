import { parseReturnTo, RETURN_TO_FALLBACK } from "@devmentor/core/validators/auth/return-to.schema";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { first, withReturnTo } from "@/app/(frontend)/auth-links";
import { AppSignInForm } from "@/app/(frontend)/sign-in/sign-in-form";
import { TOKEN_PAGE_METADATA } from "@/app/token-page";
import { getPrincipal } from "@/server/auth/page-guards";

type SearchParams = Record<string, string | string[] | undefined>;

// `returnTo` can carry an invitation's token: always no referrer, no indexing
// (platform P8, review fix R9; next.config.ts sends the headers).
export const metadata: Metadata = { title: "Sign in", ...TOKEN_PAGE_METADATA };

/**
 * /sign-in (accounts Flows 1 and 2): GitHub first, then the email form and
 * "Create an account". The GitHub button is a real link to the navigation
 * route, so it works without JavaScript; it and the sign-up link carry the
 * validated `returnTo`. `?error=github_*` and `session_expired` show their
 * banner; unknown codes show nothing. Signed in already, the page goes to
 * `returnTo` (SM-AC1).
 */
export default async function SignInPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const returnTo = parseReturnTo(first(params.returnTo));
  if (await getPrincipal()) redirect(returnTo ?? RETURN_TO_FALLBACK);

  return (
    <main className="mx-auto w-full max-w-content px-page-gutter py-section">
      <div className="flex max-w-text flex-col gap-component">
        <h1 className="text-page-title">Sign in</h1>
        <AppSignInForm
          githubHref={withReturnTo("/api/auth/github", returnTo)}
          signUpHref={withReturnTo("/sign-up", returnTo)}
          returnTo={returnTo}
          error={first(params.error)}
        />
      </div>
    </main>
  );
}
