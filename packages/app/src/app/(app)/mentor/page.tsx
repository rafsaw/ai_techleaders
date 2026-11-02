import { BookableStatusLine } from "@devmentor/ui/components/mentors/BookableStatusLine";
import type { Metadata } from "next";

import { PayoutSetupChecklist } from "@/app/(app)/mentor/payout-setup";
import { requireRole } from "@/server/auth/page-guards";
import { createRequestScope } from "@/server/container";

export const metadata: Metadata = { title: "Mentor setup" };

export default async function MentorSetupPage({ searchParams }: { searchParams: Promise<{ stripe?: string | string[] }> }) {
  const principal = await requireRole("mentor", { returnTo: "/mentor" });
  const setup = await createRequestScope().cradle.mentorProfileService.getSetup(principal);
  const stripe = (await searchParams).stripe;
  const profile = setup.profile && setup.publicUrl
    ? { status: "saved" as const, editHref: "/mentor/profile", publicHref: setup.publicUrl }
    : { status: "not-started" as const, createHref: "/mentor/profile" };
  const status = setup.bookable && setup.publicUrl
    ? (setup.upcomingSlots.open === 0 ? { status: "no-slots" as const } : { status: "bookable" as const, publicUrl: setup.publicUrl })
    : { status: "not-bookable" as const, missing: setup.profile ? ["stripe" as const] : ["profile" as const, "stripe" as const] };

  return (
    <main className="mx-auto w-full max-w-content px-page-gutter py-section">
      <div className="flex max-w-text flex-col gap-component">
        <h1 className="text-page-title">Mentor setup</h1>
        {stripe === "check_failed" ? <p role="alert">We couldn&apos;t reach Stripe to check your status. <a className="underline" href="/api/payments/onboarding/return">Try checking again</a>.</p> : null}
        <BookableStatusLine state={status} />
        <PayoutSetupChecklist profile={profile} payout={setup.payout} slots={!setup.profile ? { status: "locked" } : setup.upcomingSlots.open + setup.upcomingSlots.booked === 0 ? { status: "none", manageHref: "/mentor/slots" } : { status: "some", upcoming: setup.upcomingSlots.open + setup.upcomingSlots.booked, booked: setup.upcomingSlots.booked, manageHref: "/mentor/slots" }} />
      </div>
    </main>
  );
}
