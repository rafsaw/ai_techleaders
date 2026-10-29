"use client";

import { Notice } from "@devmentor/ui/frontend/feedback/Notice";
import { useEffect } from "react";

import { INVITATION_ACCEPTED_FLAG } from "@/app/(frontend)/auth-links";
import { dropQueryFlag } from "@/app/drop-welcome-flag";

export const INVITATION_ACCEPTED_MESSAGE = "Invitation accepted. You're now a mentor.";

/**
 * Home's one-time notice after a successful acceptance (accounts SM-AC8a).
 * The page renders it only for an account that holds mentor now; the flag is
 * dropped from the address without a navigation, so a reload does not show
 * it again.
 */
export function InvitationAcceptedNotice() {
  useEffect(() => {
    dropQueryFlag(INVITATION_ACCEPTED_FLAG);
  }, []);
  return <Notice variant="success" title={INVITATION_ACCEPTED_MESSAGE} className="max-w-text" />;
}
