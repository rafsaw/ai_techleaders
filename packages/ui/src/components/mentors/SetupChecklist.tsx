import type { ReactNode } from "react";

import { buttonVariants } from "@devmentor/ui/components/button";
import { SetupItem } from "@devmentor/ui/components/mentors/SetupItem";

// /mentor (E02 Flow 1): one item per shipped phase, each with its state in words and one next
// action. Profile and slots are mapped here from MentorSetupDto; the payouts item comes from
// PayoutStatus (payments concept). Copy from 2026-10-18-mentor-setup.md. Docs: setup-checklist.mdx.

export type ProfileSetup =
  | { status: "not-started"; createHref: string }
  | { status: "saved"; editHref: string; publicHref: string };

export type SlotsSetup =
  | { status: "locked" }
  | { status: "none"; manageHref: string }
  | { status: "some"; upcoming: number; booked: number; manageHref: string };

export interface SetupChecklistProps {
  profile: ProfileSetup;
  /** Phase 2: `<PayoutStatus …/>`. Absent in Phase 1. */
  payouts?: ReactNode;
  /** Phase 3. Absent before. */
  slots?: SlotsSetup;
}

const LOCKED_NOTE = "Save your profile first.";

function ProfileItem({ profile }: { profile: ProfileSetup }) {
  if (profile.status === "not-started") {
    return (
      <SetupItem title="Profile" state="Not started">
        <a href={profile.createHref} className={buttonVariants()}>Create your profile</a>
      </SetupItem>
    );
  }
  return (
    <SetupItem title="Profile" state="Saved" variant="success">
      <a href={profile.editHref} className={buttonVariants({ variant: "outline" })}>Edit profile</a>
      <a href={profile.publicHref} className={buttonVariants({ variant: "link" })}>View public page</a>
    </SetupItem>
  );
}

function SlotsItem({ slots }: { slots: SlotsSetup }) {
  switch (slots.status) {
    case "locked":
      return <SetupItem title="Slots" state="Locked" note={LOCKED_NOTE} />;
    case "none":
      return (
        <SetupItem title="Slots" state="No upcoming slots">
          <a href={slots.manageHref} className={buttonVariants()}>Publish slots</a>
        </SetupItem>
      );
    case "some":
      return (
        <SetupItem title="Slots" state={`${slots.upcoming} upcoming (${slots.booked} booked)`}>
          <a href={slots.manageHref} className={buttonVariants({ variant: "outline" })}>Manage slots</a>
        </SetupItem>
      );
  }
}

export function SetupChecklist({ profile, payouts, slots }: SetupChecklistProps) {
  return (
    <ol data-slot="setup-checklist" aria-label="Mentor setup" className="flex w-full max-w-text flex-col gap-between-groups">
      <ProfileItem profile={profile} />
      {payouts}
      {slots ? <SlotsItem slots={slots} /> : null}
    </ol>
  );
}

export { LOCKED_NOTE };
