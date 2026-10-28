import { emailSchema } from "@devmentor/core/validators/auth/email.schema";
import { parseReturnTo } from "@devmentor/core/validators/auth/return-to.schema";
import { CheckEmailNotice } from "@devmentor/ui/components/auth/CheckEmailNotice";
import { LinkButton } from "@devmentor/ui/frontend/actions/LinkButton";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { first, returnToPageMetadata, withReturnTo } from "@/app/(frontend)/auth-links";
import { getPrincipal } from "@/server/auth/page-guards";

type SearchParams = Record<string, string | string[] | undefined>;

// From an invitation, `returnTo` carries its token: no referrer, no indexing then.
export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }): Promise<Metadata> {
  return returnToPageMetadata("Check your email", parseReturnTo(first((await searchParams).returnTo)));
}

/**
 * /sign-up/check-email (accounts Flow 2, SM-AC3, SM-AC5): "Check your inbox
 * at …" with the 24-hour expiry, or, with `sent=0`, the not-sent message and
 * a way back to /sign-up (no cause, no countdown, no retry control). The page
 * says the same for every address, so it reveals nothing. Without a valid
 * `email` it redirects to /sign-up. Shown to signed-in visitors too: it reads
 * no account.
 */
export default async function CheckEmailPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  await getPrincipal();
  const returnTo = parseReturnTo(first(params.returnTo));
  const email = emailSchema.safeParse(first(params.email));
  if (!email.success) redirect(withReturnTo("/sign-up", returnTo));
  const emailSent = first(params.sent) !== "0";

  return (
    <main className="mx-auto w-full max-w-content px-page-gutter py-section">
      <div className="flex max-w-text flex-col items-start gap-component">
        <h1 className="text-page-title">Check your email</h1>
        <CheckEmailNotice email={email.data} emailSent={emailSent} />
        {emailSent ? (
          <LinkButton href={withReturnTo("/sign-in", returnTo)} variant="link">
            Sign in
          </LinkButton>
        ) : (
          <LinkButton href={withReturnTo("/sign-up", returnTo)}>Back to sign-up</LinkButton>
        )}
      </div>
    </main>
  );
}
