import type { Metadata } from "next";
import Link from "next/link";

import { linkButtonVariants } from "@devmentor/ui/frontend/actions/LinkButton";

// The shared error page (platform P7): `navigationHandler` redirects here with
// `?code=<code>`. Known codes get a plain explanation; anything else, including
// `internal_error`, gets the generic one. The code itself is never shown
// (design system P-ERR1). No identity lookup, request scope or DB access.
const GENERIC = "We couldn't complete your request. Please try again in a moment.";

const MESSAGES: Readonly<Record<string, string>> = {
  unauthorized: "You need to be signed in to do that. Sign in, then try again.",
  forbidden: "Your account doesn't have access to that page.",
  not_found: "We couldn't find what you were looking for.",
};

export const metadata: Metadata = { title: "Something went wrong" };

function errorMessage(code: string | string[] | undefined): string {
  return typeof code === "string" && Object.hasOwn(MESSAGES, code) ? MESSAGES[code]! : GENERIC;
}

export default async function ErrorPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const { code } = await searchParams;
  return (
    <main className="mx-auto flex w-full max-w-content flex-col items-start gap-component px-page-gutter py-section">
      <h1 className="text-page-title text-foreground">Something went wrong</h1>
      <p className="max-w-text text-body text-muted-foreground">{errorMessage(code)}</p>
      <Link href="/" className={linkButtonVariants()}>
        Go to the home page
      </Link>
    </main>
  );
}
