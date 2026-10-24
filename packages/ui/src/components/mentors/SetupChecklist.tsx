import { buttonVariants } from "@devmentor/ui/components/button";
import { LOCKED_NOTE, SetupItem } from "@devmentor/ui/components/mentors/SetupItem";
import { payoutHasAction, PayoutStatus, type PayoutStatusProps } from "@devmentor/ui/components/payments/PayoutStatus";

// /mentor (E02 Flow 1): one item per shipped phase, each with its state in words and one next
// action. Profile and slots are mapped here from MentorSetupDto; the payouts item is PayoutStatus
// (payments concept). The primary button belongs to the first unfinished item that has an action
// to take; every other action is outline, so the screen has at most one main action (R01.6, P-M4,
// Q-SC1). Copy from 2026-10-18-mentor-setup.md.
// Docs: setup-checklist.mdx.

export type ProfileSetup =
  | { status: "not-started"; createHref: string }
  | { status: "saved"; editHref: string; publicHref: string };

export type SlotsSetup =
  | { status: "locked" }
  | { status: "none"; manageHref: string }
  | { status: "some"; upcoming: number; booked: number; manageHref: string };

export interface SetupChecklistProps {
  profile: ProfileSetup;
  /** Phase 2: the PayoutStatus props (without `next`, which the checklist sets). Absent in Phase 1. */
  payouts?: Omit<PayoutStatusProps, "next">;
  /** Phase 3. Absent before. */
  slots?: SlotsSetup;
}

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

type Step = "profile" | "payouts" | "slots";

/**
 * The first unfinished item with an action to take: it gets the page's primary button. An item
 * that is waiting (payouts while Stripe checks) is skipped. Undefined when no item has an action.
 */
export function firstWithAction({ profile, payouts, slots }: SetupChecklistProps): Step | undefined {
  if (profile.status !== "saved") return "profile";
  if (payouts && payoutHasAction(payouts.payout)) return "payouts";
  if (slots?.status === "none") return "slots";
  return undefined;
}

function SlotsItem({ slots, next }: { slots: SlotsSetup; next: boolean }) {
  switch (slots.status) {
    case "locked":
      return <SetupItem title="Slots" state="Locked" note={LOCKED_NOTE} />;
    case "none":
      return (
        <SetupItem title="Slots" state="No upcoming slots">
          <a href={slots.manageHref} className={buttonVariants({ variant: next ? "default" : "outline" })}>Publish slots</a>
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

export function SetupChecklist(props: SetupChecklistProps) {
  const { profile, payouts, slots } = props;
  const next = firstWithAction(props);
  return (
    <ol data-slot="setup-checklist" aria-label="Mentor setup" className="flex w-full max-w-text flex-col gap-between-groups">
      <ProfileItem profile={profile} />
      {payouts ? <PayoutStatus {...payouts} next={next === "payouts"} /> : null}
      {slots ? <SlotsItem slots={slots} next={next === "slots"} /> : null}
    </ol>
  );
}

export { LOCKED_NOTE };
