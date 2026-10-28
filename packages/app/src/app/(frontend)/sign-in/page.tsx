import { parseReturnTo, RETURN_TO_FALLBACK } from "@devmentor/core/validators/auth/return-to.schema";
import { SignInOptions } from "@devmentor/ui/components/auth/SignInOptions";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getPrincipal } from "@/server/auth/page-guards";

export const metadata: Metadata = { title: "Sign in" };

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * /sign-in (accounts Flow 1, Phase 1): GitHub only. The GitHub button is a
 * real link to the navigation route, so it works without JavaScript, and it
 * carries the validated `returnTo`. `?error=github_*` shows its banner;
 * unknown codes show nothing. Signed in already, the page goes to `returnTo`
 * (SM-AC1). The email form arrives in Phase 2.
 */
export default async function SignInPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const returnTo = parseReturnTo(first(params.returnTo));
  if (await getPrincipal()) redirect(returnTo ?? RETURN_TO_FALLBACK);

  const githubHref = returnTo ? `/api/auth/github?returnTo=${encodeURIComponent(returnTo)}` : "/api/auth/github";
  return (
    <main className="mx-auto w-full max-w-content px-page-gutter py-section">
      <div className="flex max-w-text flex-col gap-component">
        <h1 className="text-page-title">Sign in</h1>
        <SignInOptions githubHref={githubHref} error={first(params.error)} />
      </div>
    </main>
  );
}
