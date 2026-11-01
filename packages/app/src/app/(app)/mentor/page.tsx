import { BookableStatusLine } from "@devmentor/ui/components/mentors/BookableStatusLine";
import { SetupChecklist } from "@devmentor/ui/components/mentors/SetupChecklist";
import type { Metadata } from "next";

import { requireRole } from "@/server/auth/page-guards";
import { createRequestScope } from "@/server/container";

export const metadata: Metadata = { title: "Mentor setup" };

export default async function MentorSetupPage() {
  const principal = await requireRole("mentor", { returnTo: "/mentor" });
  const setup = await createRequestScope().cradle.mentorProfileService.getSetup(principal);
  const profile = setup.profile && setup.publicUrl
    ? { status: "saved" as const, editHref: "/mentor/profile", publicHref: setup.publicUrl }
    : { status: "not-started" as const, createHref: "/mentor/profile" };

  return (
    <main className="mx-auto w-full max-w-content px-page-gutter py-section">
      <div className="flex max-w-text flex-col gap-component">
        <h1 className="text-page-title">Mentor setup</h1>
        <BookableStatusLine state={{ status: "phase-1" }} />
        <SetupChecklist profile={profile} />
      </div>
    </main>
  );
}
