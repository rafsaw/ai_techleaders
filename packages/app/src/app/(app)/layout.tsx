import type { ReactNode } from "react";

import { AppSiteHeader } from "@/app/site-header";
import { getPrincipal } from "@/server/auth/page-guards";

// The signed-in area (platform PD2/F4): shadcn components.
//
// Access is enforced by each page's `requirePrincipal`, which carries that
// page's own `returnTo` (platform P4). The layout cannot: it does not know the
// requested path, it renders before the page (so its redirect would win and
// drop `returnTo`), and it is reused on client navigation. Signed out, it
// renders no header and lets the page's guard redirect.
export default async function SignedInLayout({ children }: Readonly<{ children: ReactNode }>) {
  const principal = await getPrincipal();
  if (!principal) return children;
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <AppSiteHeader account={{ displayName: principal.displayName, roles: principal.roles }} />
      {children}
    </div>
  );
}
