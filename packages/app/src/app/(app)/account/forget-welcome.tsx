"use client";

import { useEffect } from "react";

/**
 * Drops `?welcome=1` from the address once the notice has rendered, without a
 * navigation, so reloading the page does not show the notice again (SM-AC7).
 * Next.js syncs `replaceState` with its router.
 */
export function ForgetWelcome({ path }: { path: string }) {
  useEffect(() => {
    window.history.replaceState(window.history.state, "", path);
  }, [path]);
  return null;
}
