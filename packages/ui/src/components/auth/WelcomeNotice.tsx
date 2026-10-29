import type { ComponentType, ReactNode } from "react";

import { linkButtonVariants } from "@devmentor/ui/frontend/actions/LinkButton";
import { Notice } from "@devmentor/ui/frontend/feedback/Notice";

// The one-time notice after a new account's first GitHub sign-in (E01 Flow 1 step 5, SM-AC7) on
// the `returnTo` page: the display name is public and can be changed in Account settings. `/account`
// shows the same title inside AccountSummary instead. Tailwind only (F3), so public pages can use
// it; the app decides when to show it. Docs: welcome-notice.mdx.

/** The same words as the `/account` notice in AccountSummary. */
export const WELCOME_TITLE = "This is the name others see. You can change it.";

export interface WelcomeNoticeProps {
  /** The new account's display name, from the principal. */
  displayName: string;
  /** Default `/account`. */
  accountHref?: string;
  /** Next's `Link` in the app (ui cannot import next); a plain `<a>` by default. */
  linkComponent?: ComponentType<{ href: string; className?: string; children: ReactNode }> | "a";
  className?: string;
}

export function WelcomeNotice({ displayName, accountHref = "/account", linkComponent: Link = "a", className }: WelcomeNoticeProps) {
  return (
    <Notice data-slot="welcome-notice" variant="info" title={WELCOME_TITLE} className={className}>
      <p>
        Your display name: <strong className="font-semibold wrap-anywhere">{displayName}</strong>
      </p>
      <Link href={accountHref} className={linkButtonVariants({ variant: "link" })}>
        Change it in Account settings
      </Link>
    </Notice>
  );
}
