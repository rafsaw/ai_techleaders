import type { Metadata } from "next";
import Link from "next/link";

import { linkButtonVariants } from "@devmentor/ui/frontend/actions/LinkButton";

// The neutral 404 (accounts SM-AC13): unknown URLs and pages a signed-in
// account may not open (e.g. `/backend` without `operator`) look the same, so
// the response does not reveal that a protected area exists. Identity-free:
// no principal, request scope or database access.
export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-content flex-col items-start gap-component px-page-gutter py-section">
      <h1 className="text-page-title text-foreground">Page not found</h1>
      <p className="max-w-text text-body text-muted-foreground">We couldn&apos;t find the page you were looking for.</p>
      <Link href="/" className={linkButtonVariants()}>
        Go to the home page
      </Link>
    </main>
  );
}
