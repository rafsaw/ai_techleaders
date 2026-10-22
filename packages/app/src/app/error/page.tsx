import type { Metadata } from "next";
import Link from "next/link";

import { linkButtonVariants } from "@devmentor/ui/frontend/actions/LinkButton";
import { cn } from "@devmentor/ui/lib/utils";

export const metadata: Metadata = { title: "Something went wrong" };

const headerLinkClasses =
  "rounded-control text-row-title text-foreground underline-offset-4 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring";

/**
 * The identity-free fallback for failures that may include session or database access.
 * Keep this route static: it must not create a request scope or render account navigation.
 */
export default function ErrorPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-content items-center px-page-gutter py-list-row-y">
          <Link href="/" className={headerLinkClasses}>
            DevMentor
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-content px-page-gutter py-section">
        <div className="flex max-w-text flex-col gap-component">
          <h1 className="text-page-title">Something went wrong</h1>
          <p className="text-body text-muted-foreground">
            We couldn&apos;t load this page. Please try again from the home page.
          </p>
          <Link href="/" className={cn(linkButtonVariants(), "w-full md:w-auto md:self-start")}>
            Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}
