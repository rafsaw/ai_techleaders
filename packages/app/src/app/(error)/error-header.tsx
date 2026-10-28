import Link from "next/link";

// Identity-free header for /error: the brand link only. It never shows Sign in
// or an account, because the page cannot know who is signed in (SiteHeader with
// `account={null}` would wrongly present the visitor as signed out).
export function ErrorHeader() {
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex max-w-content items-center px-page-gutter py-list-row-y">
        <Link
          href="/"
          className="rounded-control text-row-title text-foreground outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          DevMentor
        </Link>
      </div>
    </header>
  );
}
