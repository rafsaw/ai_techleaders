"use client";

import { useState } from "react";
import { onboardingCountries } from "@devmentor/core/validators/payments/onboarding-start.schema";
import { apiCall } from "@devmentor/ui/api/apiCall";
import { Alert, AlertTitle } from "@devmentor/ui/components/alert";
import { buttonVariants } from "@devmentor/ui/components/button";
import { SetupChecklist, type ProfileSetup, type SlotsSetup } from "@devmentor/ui/components/mentors/SetupChecklist";
import type { PayoutSetup } from "@devmentor/ui/components/payments/PayoutStatus";
import { useRouter } from "next/navigation";

import { unlessSessionExpired } from "@/app/session-expiry";
import type { MentorSetupDto } from "@/server/services/mentors/mentor-profile.service";

const names = new Intl.DisplayNames(["en"], { type: "region" });
const countries = onboardingCountries.map((code) => ({ code, name: names.of(code)! }));
const checkStatusHref = "/api/payments/onboarding/return";

export function payoutSetup(profile: ProfileSetup, payout: MentorSetupDto["payout"]): PayoutSetup {
  if (profile.status !== "saved") return { status: "locked" };
  switch (payout.provisioningState) {
    case null: return { status: "no-row", countries };
    case "pending": return { status: "provisioning-pending" };
    case "reconciliation_required": return { status: "reconciliation-required" };
    case "failed": return { status: "failed" };
    case "provisioned":
      switch (payout.status) {
        case "pending": return { status: "pending", checkStatusHref };
        case "ready": return { status: "ready" };
        case "blocked": return { status: "blocked" };
        default: return { status: "incomplete" };
      }
  }
}

export function PayoutSetupChecklist({ profile, payout, slots }: { profile: ProfileSetup; payout: MentorSetupDto["payout"]; slots?: SlotsSetup }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const state = payoutSetup(profile, payout);
  return (
    <>
      {error ? <Alert variant="destructive"><AlertTitle>{error}</AlertTitle></Alert> : null}
      {error && payout.provisioningState === "provisioned" && payout.status === "incomplete" ? (
        <a className={buttonVariants({ variant: "outline" })} href={checkStatusHref}>Check status</a>
      ) : null}
      {payout.country ? <p>Country: {names.of(payout.country)}</p> : null}
      <SetupChecklist profile={profile} slots={slots} payouts={{
        payout: state,
        startOnboarding: async (body) => {
          setError(undefined);
          return unlessSessionExpired(await apiCall<{ url: string }>("/api/payments/onboarding", {
            method: "POST",
            body: { country: body.country ?? payout.country },
          }), "/mentor");
        },
        onOnboardingUrl: (url) => window.location.assign(url),
        onError: (message) => { setError(message); router.refresh(); },
      }} />
    </>
  );
}
