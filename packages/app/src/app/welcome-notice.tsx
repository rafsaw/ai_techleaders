"use client";

import { WelcomeNotice } from "@devmentor/ui/components/auth/WelcomeNotice";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

// The one-time welcome notice on a new account's `returnTo` page (accounts Flow 1 step 5, SM-AC7).
// The personalized layouts render this only while someone is signed in; the callback adds
// `welcome=1` only for a newly created account. `/account` renders its own notice inside
// AccountSummary, so this one stays away from it and the notice never shows twice.

const OWN_NOTICE_PATH = "/account";

/** The current address without the `welcome` parameter, keeping the others and the hash. */
function addressWithoutWelcome(): string {
  const url = new URL(window.location.href);
  url.searchParams.delete("welcome");
  return `${url.pathname}${url.search}${url.hash}`;
}

export function AppWelcomeNotice({ displayName }: { displayName: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Latched on the first render: Next syncs `replaceState` with `useSearchParams`, so deriving
  // this live would hide the notice as soon as the flag is dropped below.
  const [shownOn, setShownOn] = useState(() =>
    searchParams.get("welcome") === "1" && pathname !== OWN_NOTICE_PATH ? pathname : null,
  );

  useEffect(() => {
    // Without a navigation, so a reload does not show the notice again.
    if (shownOn !== null) window.history.replaceState(window.history.state, "", addressWithoutWelcome());
  }, [shownOn]);

  if (shownOn === null) return null;
  if (shownOn !== pathname) {
    // A client navigation to another page (the layout stays mounted): forget the notice for good,
    // so coming back does not show it again.
    setShownOn(null);
    return null;
  }
  return (
    <div className="mx-auto w-full max-w-content px-page-gutter pt-component">
      <WelcomeNotice displayName={displayName} linkComponent={Link} className="max-w-text" />
    </div>
  );
}
