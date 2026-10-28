import type { ReactNode } from "react";

import { AppSiteHeader } from "@/app/site-header";
import { getPrincipal } from "@/server/auth/page-guards";

// The public area (platform PD2/F4): plain Tailwind, no access gate. The
// header shows the sign-in state. Each leaf page still calls getPrincipal()
// itself, because this layout is reused on client navigation and would not
// record the activity of later page requests.
export default async function FrontendLayout({ children }: Readonly<{ children: ReactNode }>) {
  const principal = await getPrincipal();
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <AppSiteHeader account={principal && { displayName: principal.displayName, roles: principal.roles }} />
      {children}
    </div>
  );
}
