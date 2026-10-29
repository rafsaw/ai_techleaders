"use client";

import { useState, type ComponentType, type ReactNode } from "react";

import type { ApiResult } from "@devmentor/ui/api/types";
import { LinkButton, linkButtonVariants } from "@devmentor/ui/frontend/actions/LinkButton";
import { cn } from "@devmentor/ui/lib/utils";

// The header of both areas (E01 UI/UX, E02 Phase 1): signed out, Sign in; signed in, the display
// name linking to /account, Mentor setup for mentors (only when the app passes `mentorSetupHref`,
// from E02 Phase 1), Backend for operators, and Sign out.
// Tailwind only (F3), so public pages can use it. /error keeps its own identity-free header.
// Docs: site-header.mdx.

export interface SiteHeaderProps {
  /** `null` when signed out. */
  account: { displayName: string; roles: readonly string[] } | null;
  /** `/sign-in`, with returnTo when the page has one. */
  signInHref?: string;
  /** POST /api/auth/sign-out; on success the page navigates to `redirectTo`. */
  signOut?: () => Promise<ApiResult<{ redirectTo: string }>>;
  onSignedOut?: (redirectTo: string) => void;
  /**
   * Where **Mentor setup** goes. The link renders only for mentors and only when this is given:
   * E01 omits it because the mentor area ships in E02 Phase 1 (E01 never links to an unshipped page).
   */
  mentorSetupHref?: string;
  /** Next's `Link` in the app (ui cannot import next); a plain `<a>` by default. */
  linkComponent?: ComponentType<{ href: string; className?: string; title?: string; children: ReactNode }> | "a";
}

const navLink = "rounded-control text-label text-foreground underline-offset-4 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring";

export function SiteHeader({ account, signInHref = "/sign-in", signOut, onSignedOut, mentorSetupHref, linkComponent: Link = "a" }: SiteHeaderProps) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleSignOut() {
    if (!signOut) return;
    setPending(true);
    setFailed(false);
    const result = await signOut();
    setPending(false);
    if (result.ok) onSignedOut?.(result.data.redirectTo);
    else setFailed(true);
  }

  return (
    <header data-slot="site-header" className="border-b border-border bg-background">
      <div className="mx-auto flex max-w-content flex-wrap items-center justify-between gap-x-component gap-y-in-group px-page-gutter py-list-row-y">
        <Link href="/" className={cn(navLink, "text-row-title hover:no-underline")}>
          DevMentor
        </Link>
        <nav aria-label="Account" className="min-w-0">
          {account ? (
            <>
              <ul className="flex flex-wrap items-center gap-x-between-groups gap-y-in-group">
                {mentorSetupHref && account.roles.includes("mentor") ? (
                  <li><Link href={mentorSetupHref} className={navLink}>Mentor setup</Link></li>
                ) : null}
                {account.roles.includes("operator") ? (
                  <li><Link href="/backend" className={navLink}>Backend</Link></li>
                ) : null}
                <li className="min-w-0">
                  <Link href="/account" className={cn(navLink, "block max-w-48 truncate")} title={account.displayName}>
                    {account.displayName}
                  </Link>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={pending}
                    aria-describedby={failed ? "sign-out-error" : undefined}
                    className={linkButtonVariants({ variant: "outline" })}
                  >
                    {pending ? "Signing out…" : "Sign out"}
                  </button>
                </li>
              </ul>
              {failed ? (
                <p id="sign-out-error" role="alert" className="mt-in-group text-meta text-destructive">
                  Could not sign out. Try again.
                </p>
              ) : null}
            </>
          ) : (
            <LinkButton href={signInHref} variant="outline">
              Sign in
            </LinkButton>
          )}
        </nav>
      </div>
    </header>
  );
}
