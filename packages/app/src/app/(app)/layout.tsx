import { Suspense, type ReactNode } from "react";

import { AppSiteHeader } from "@/app/site-header";
import { AppWelcomeNotice } from "@/app/welcome-notice";
import { getPrincipal } from "@/server/auth/page-guards";

// The signed-in area (platform PD2/F4): shadcn components.
//
// Access is enforced by each page's `requirePrincipal`, which carries that
// page's own `returnTo` (platform P4). The layout cannot: it does not know the
// requested path, it renders before the page (so its redirect would win and
// drop `returnTo`), and it is reused on client navigation. Signed out, it
// renders no header and lets the page's guard redirect. Signed in, a
// `welcome=1` page other than /account (which has its own) shows the one-time
// welcome notice (SM-AC7).
export default async function SignedInLayout({ children }: Readonly<{ children: ReactNode }>) {
  const principal = await getPrincipal();
  if (!principal) return children;
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <AppSiteHeader account={{ displayName: principal.displayName, roles: principal.roles }} />
      <Suspense fallback={null}>
        <AppWelcomeNotice displayName={principal.displayName} />
      </Suspense>
      {children}
    </div>
  );
}
