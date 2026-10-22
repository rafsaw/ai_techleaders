import { LinkButton } from "@devmentor/ui/frontend/actions/LinkButton";
import { Notice } from "@devmentor/ui/frontend/feedback/Notice";

// /error?code=internal_error (E01 "Auth navigation and error fallback"): a minimal public screen
// with an identity-free header (no account, no sign-in link) and one way out. Public kit only (F3).

export function ErrorPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-content items-center px-page-gutter py-list-row-y">
          <span className="text-row-title">DevMentor</span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-content px-page-gutter py-section">
        <div className="flex max-w-text flex-col gap-component">
          <h1 className="text-page-title">Something went wrong</h1>
          <Notice variant="error" title="We couldn't complete your request.">
            This is a problem on our side. Try again in a moment.
            <LinkButton href="/">Go to the home page</LinkButton>
          </Notice>
        </div>
      </main>
    </div>
  );
}
