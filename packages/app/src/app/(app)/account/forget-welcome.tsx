"use client";

import { useEffect } from "react";

import { dropWelcomeFlag } from "@/app/drop-welcome-flag";

/**
 * Drops `welcome=1` from the address once the notice has rendered, keeping the other query
 * parameters and the hash, so reloading the page does not show the notice again (SM-AC7).
 */
export function ForgetWelcome() {
  useEffect(() => {
    dropWelcomeFlag();
  }, []);
  return null;
}
