import type { ReactNode } from "react";
import { fn } from "storybook/test";

import type { ApiResult } from "@devmentor/ui/api/types";
import { SiteHeader, type SiteHeaderProps } from "@devmentor/ui/components/auth/SiteHeader";
import { cn } from "@devmentor/ui/lib/utils";

// Story-only page frame for Screens: the real SiteHeader over a main column on the header's own
// grid (max-w-content, page-gutter). The app has no (frontend)/(app) layout yet, so this frame is
// P-SCR1 (proposal approved by Rafał); the app's layouts should match it. Never exported from the package.

export const ADA = { displayName: "Ada Nowak", roles: ["mentee"] } as const;
export const ADA_MENTOR = { displayName: "Ada Nowak", roles: ["mentee", "mentor"] } as const;

const signOut = fn(async (): Promise<ApiResult<{ redirectTo: string }>> => ({ ok: true, data: { redirectTo: "/" } }));

export function Screen({
  account,
  title,
  width = "content",
  children,
}: {
  account: SiteHeaderProps["account"];
  /** The page's h1; omit when a component renders it (MentorProfileHeader). */
  title?: string;
  /** `text` for single-column forms and messages, `content` for wider pages. */
  width?: "text" | "content";
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <SiteHeader account={account} signOut={signOut} onSignedOut={fn()} />
      <main className="mx-auto w-full max-w-content px-page-gutter py-section">
        <div className={cn("flex flex-col gap-component", width === "text" && "max-w-text")}>
          {title ? <h1 className="text-page-title">{title}</h1> : null}
          {children}
        </div>
      </main>
    </div>
  );
}

/** Story parameters shared by every screen: full-bleed canvas, docs show each state in an iframe. */
export const screenParameters = {
  layout: "fullscreen",
  docs: { story: { inline: false, iframeHeight: 640 } },
} as const;
