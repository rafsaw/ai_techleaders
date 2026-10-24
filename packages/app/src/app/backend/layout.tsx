import Link from "next/link";
import type { ReactNode } from "react";

import { buttonVariants } from "@devmentor/ui/components/button";

// Backend (admin) pages: composed from @devmentor/ui shadcn components.
export default function BackendLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
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
