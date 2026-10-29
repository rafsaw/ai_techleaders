"use client";

import { apiCall } from "@devmentor/ui/api/apiCall";
import { SiteHeader, type SiteHeaderProps } from "@devmentor/ui/components/auth/SiteHeader";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { navigateFully } from "@/app/full-navigation";

// The app's header for the public and signed-in areas (accounts UI/UX): the
// design-system SiteHeader wired to Next's Link and to POST /api/auth/sign-out.
// The layouts read the principal on the server and pass only what the header
// shows. `/error` never renders this: its header is identity-free.

/** Pages that should not be offered as the destination after signing in. */
function signInHref(pathname: string): string {
  if (pathname === "/" || pathname.startsWith("/sign-in")) return "/sign-in";
  return `/sign-in?returnTo=${encodeURIComponent(pathname)}`;
}

function signOut() {
  return apiCall<{ redirectTo: string }>("/api/auth/sign-out", { method: "POST" });
}

export function AppSiteHeader({ account }: Pick<SiteHeaderProps, "account">) {
  const pathname = usePathname();
  return (
    <SiteHeader
      account={account}
      signInHref={signInHref(pathname)}
      signOut={signOut}
      // Only after a successful sign-out: a full navigation renders every
      // layout again without the session. A failure stays on the page and
      // SiteHeader shows its error (SM-AC10).
      onSignedOut={navigateFully}
      linkComponent={Link}
    />
  );
}
