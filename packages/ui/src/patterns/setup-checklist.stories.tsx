import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";

import { apiCall } from "@devmentor/ui/backend/api/apiCall";
import { BookableStatusLine, type BookableStatus } from "@devmentor/ui/components/mentors/BookableStatusLine";
import { SetupChecklist, type ProfileSetup, type SlotsSetup } from "@devmentor/ui/components/mentors/SetupChecklist";
import type { PayoutSetup } from "@devmentor/ui/components/payments/PayoutStatus";

// MD8: US, UK, EEA, Canada or Switzerland (a few shown).
const countries = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "PL", name: "Poland" },
  { code: "CA", name: "Canada" },
];

interface Setup {
  line: BookableStatus;
  profile: ProfileSetup;
  payout?: PayoutSetup;
  slots?: SlotsSetup;
}

/** /mentor (E02 Flow 1): the status line, then one item per shipped phase. */
function MentorSetup({ line, profile, payout, slots }: Setup) {
  return (
    <main className="flex w-full max-w-text flex-col gap-component">
      <h1 className="text-page-title">Mentor setup</h1>
      <BookableStatusLine state={line} copy={fn(async () => {})} />
      <SetupChecklist
        profile={profile}
        slots={slots}
        payouts={
          payout
            ? {
                payout,
                startOnboarding: (body) => apiCall<{ url: string }>("/api/payments/onboarding", { method: "POST", body }),
                onOnboardingUrl: fn(),
                contactHref: "mailto:team@devmentor.example",
              }
            : undefined
        }
      />
    </main>
  );
}

const saved = { status: "saved", editHref: "/mentor/profile", publicHref: "/mentors/7f3c9b2e" } as const;

const meta = {
  title: "Patterns/Setup checklist",
  tags: ["!autodocs"],
  args: {
    line: { status: "not-bookable", missing: ["profile", "stripe"] },
    profile: { status: "not-started", createHref: "/mentor/profile" },
    payout: { status: "locked" },
    slots: { status: "locked" },
  },
  render: (args: Setup) => <MentorSetup {...args} />,
} satisfies Meta<Setup>;

export default meta;
type Story = StoryObj<typeof meta>;

// The first unfinished item with an action holds the one primary button (R01.6, P-M4, Q-SC1).
const primaryActions = (root: HTMLElement) =>
  [...root.querySelectorAll("a, button")].filter((element) => element.classList.contains("bg-primary"));

/** Step 1, a new mentor: one next action, Create your profile; the rest say why they are locked. */
export const Playground: Story = {
  play: async ({ canvas, canvasElement }) => {
    await expect(primaryActions(canvasElement).map((element) => element.textContent)).toEqual(["Create your profile"]);
    await expect(canvas.getAllByText("Save your profile first.")).toHaveLength(2);
  },
};

/** Step 2: the profile is done (outline actions); the next step is Continue to Stripe. Publish slots waits in outline. */
export const StepPayouts: Story = {
  args: { line: { status: "not-bookable", missing: ["stripe"] }, profile: saved, payout: { status: "no-row", countries }, slots: { status: "none", manageHref: "/mentor/slots" } },
  play: async ({ canvasElement }) => {
    await expect(primaryActions(canvasElement).map((element) => element.textContent)).toEqual(["Continue to Stripe"]);
  },
};

/** Step 3: bookable but nothing to pick; the next step is Publish slots. */
export const StepSlots: Story = {
  args: { line: { status: "no-slots" }, profile: saved, payout: { status: "ready" }, slots: { status: "none", manageHref: "/mentor/slots" } },
  play: async ({ canvasElement }) => {
    await expect(primaryActions(canvasElement).map((element) => element.textContent)).toEqual(["Publish slots"]);
  },
};

/**
 * Waiting on Stripe: payouts has no action to take (Check status only), so the primary button
 * moves to the next unfinished item with an action, Publish slots.
 */
export const Waiting: Story = {
  args: {
    line: { status: "not-bookable", missing: ["stripe"] },
    profile: saved,
    payout: { status: "pending", checkStatusHref: "/api/payments/onboarding/return" },
    slots: { status: "none", manageHref: "/mentor/slots" },
  },
  play: async ({ canvasElement }) => {
    await expect(primaryActions(canvasElement).map((element) => element.textContent)).toEqual(["Publish slots"]);
  },
};

/** Waiting on Stripe with slots already published: no item has an action, so no primary button. */
export const WaitingNothingToDo: Story = {
  args: {
    line: { status: "not-bookable", missing: ["stripe"] },
    profile: saved,
    payout: { status: "pending", checkStatusHref: "/api/payments/onboarding/return" },
    slots: { status: "some", upcoming: 3, booked: 0, manageHref: "/mentor/slots" },
  },
  play: async ({ canvasElement }) => {
    await expect(primaryActions(canvasElement)).toHaveLength(0);
  },
};

/** Done: bookable, every item confirmed; only the public link and maintenance actions remain. */
export const Done: Story = {
  args: {
    line: { status: "bookable", publicUrl: "https://devmentor.example/mentors/7f3c9b2e" },
    profile: saved,
    payout: { status: "ready" },
    slots: { status: "some", upcoming: 24, booked: 9, manageHref: "/mentor/slots" },
  },
  play: async ({ canvasElement }) => {
    await expect(primaryActions(canvasElement)).toHaveLength(0);
  },
};

/**
 * Blocked at Stripe: Contact the DevMentor team is payouts' action, so it is the primary;
 * Publish slots waits in outline.
 */
export const Blocked: Story = {
  args: {
    line: { status: "not-bookable", missing: ["stripe"] },
    profile: saved,
    payout: { status: "blocked" },
    slots: { status: "none", manageHref: "/mentor/slots" },
  },
  play: async ({ canvasElement }) => {
    await expect(primaryActions(canvasElement).map((element) => element.textContent)).toEqual(["Contact the DevMentor team"]);
  },
};

/** Phase 1: only the profile item exists and the line is always "Not bookable yet." */
export const PhaseOne: Story = { args: { line: { status: "phase-1" }, payout: undefined, slots: undefined } };

/** 320 px: the line, the items and their actions stack. */
export const Narrow: Story = {
  globals: { viewport: { value: "w320", isRotated: false } },
  args: StepPayouts.args,
  play: async ({ canvasElement }) => {
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth);
  },
};
