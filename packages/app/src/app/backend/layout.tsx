import type { Principal } from "@devmentor/core";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { buttonVariants } from "@devmentor/ui/components/button";

import { getPrincipal } from "@/server/auth/page-guards";

// Backend (admin) pages: composed from @devmentor/ui shadcn components and
// open only to the `operator` role (accounts AD4).
//
// Each page calls `requireRole("operator", { returnTo })` with its own path:
// the layout does not know the requested path, renders before the page (so
// its redirect would win and drop `returnTo`), and is reused on client
// navigation. The layout still never renders the backend chrome without the
// role: signed out it renders only the page, whose guard redirects to
// sign-in; signed in without `operator` it answers the neutral 404.

/** The operator, or null when signed out; any other account gets the 404. */
async function operatorOrSignedOut(): Promise<Principal | null> {
  const principal = await getPrincipal();
  if (principal && !principal.roles.includes("operator")) notFound();
  return principal;
}

export default async function BackendLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  if (!(await operatorOrSignedOut())) return children;
  return (
    <div className="flex min-h-dvh flex-col bg-muted/40">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-6">
            <Link href="/backend" className="font-semibold">
              DevMentor <span className="font-normal text-muted-foreground">Backend</span>
            </Link>
            <nav className="flex gap-4 text-sm text-muted-foreground">
              <Link href="/backend/users" className="hover:text-foreground">
                Users
              </Link>
            </nav>
          </div>
          <Link href="/" className={buttonVariants({ variant: "outline", size: "sm" })}>
            View site
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
