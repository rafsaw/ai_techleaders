import type { ComponentType, ReactNode } from "react";

import { LinkButton } from "@devmentor/ui/frontend/actions/LinkButton";

type LinkComponent = ComponentType<{
  href: string;
  className?: string;
  title?: string;
  children: ReactNode;
}> | "a";

export interface ErrorPageProps {
  /** Next's Link in the app; a plain anchor is used by default. */
  linkComponent?: LinkComponent;
}

const brandLinkClassName =
  "rounded-control text-row-title text-foreground underline-offset-4 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring";

/** Identity-free public fallback for /error?code=internal_error. */
export function ErrorPage({ linkComponent: Link = "a" }: ErrorPageProps = {}) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-content items-center px-page-gutter py-list-row-y">
          <Link href="/" className={brandLinkClassName}>
            DevMentor
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-content px-page-gutter py-section">
        <div className="flex max-w-text flex-col items-start gap-component">
          <h1 className="text-page-title">Something went wrong</h1>
          <p className="text-body text-foreground">
            We couldn&apos;t complete your request. Please try again in a moment.
          </p>
          <LinkButton href="/" className="w-full md:w-auto">
            Go to the home page
          </LinkButton>
        </div>
      </main>
    </div>
  );
}
