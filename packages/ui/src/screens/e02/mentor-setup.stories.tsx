import type { Meta, StoryObj } from "@storybook/react-vite";
import { http } from "msw";
import { expect, fn } from "storybook/test";

import { apiCall } from "@devmentor/ui/api/apiCall";
import { BookableStatusLine, type BookableStatus } from "@devmentor/ui/components/mentors/BookableStatusLine";
import { SetupChecklist, type ProfileSetup, type SlotsSetup } from "@devmentor/ui/components/mentors/SetupChecklist";
import type { PayoutSetup } from "@devmentor/ui/components/payments/PayoutStatus";

import { fail, ok } from "../../../.storybook/blocks/fixtures";
import { ADA_MENTOR, Screen, screenParameters } from "../../../.storybook/blocks/screen";
import { RETURN_ROUTE, StripeBanner, type StripeBannerKind } from "../../../.storybook/blocks/stripe-banner";

const ONBOARDING = "/api/payments/onboarding";
const countries = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "PL", name: "Poland" },
  { code: "DE", name: "Germany" },
  { code: "CA", name: "Canada" },
  { code: "CH", name: "Switzerland" },
];
const saved = { status: "saved", editHref: "/mentor/profile", publicHref: "/mentors/7f3c9b2e" } as const;
const noSlots = { status: "none", manageHref: "/mentor/slots" } as const;

interface Args {
  banner?: StripeBannerKind;
  line: BookableStatus;
  profile: ProfileSetup;
  payout?: PayoutSetup;
  slots?: SlotsSetup;
}

/** /mentor (E02 Flow 1, signed-in): banner after Stripe, status line, checklist. */
function MentorSetupScreen({ banner, line, profile, payout, slots }: Args) {
  return (
    <Screen account={ADA_MENTOR} title="Mentor setup" width="text">
      {banner ? <StripeBanner banner={banner} /> : null}
      <BookableStatusLine state={line} copy={fn(async () => {})} />
      <SetupChecklist
        profile={profile}
        slots={slots}
        payouts={
          payout
            ? {
                payout,
                startOnboarding: (body) => apiCall<{ url: string }>(ONBOARDING, { method: "POST", body }),
                onOnboardingUrl: fn(),
                contactHref: "mailto:team@devmentor.example",
              }
            : undefined
        }
      />
    </Screen>
  );
}

const meta = {
  title: "Screens/E02/Mentor setup",
  tags: ["!autodocs"],
  parameters: { ...screenParameters, msw: [http.post(ONBOARDING, () => ok({ url: "https://connect.stripe.com/setup/e/acct_1" }))] },
  args: {
    line: { status: "not-bookable", missing: ["profile", "stripe"] },
    profile: { status: "not-started", createHref: "/mentor/profile" },
    payout: { status: "locked" },
    slots: { status: "locked" },
  },
  render: (args: Args) => <MentorSetupScreen {...args} />,
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

const primary = (root: HTMLElement) => [...root.querySelectorAll("main a, main button")].filter((el) => el.classList.contains("bg-primary"));

/** First visit after accepting the invitation: Create your profile is the one next step. */
export const NewMentor: Story = {
  play: async ({ canvasElement }) => {
    await expect(primary(canvasElement).map((el) => el.textContent)).toEqual(["Create your profile"]);
  },
};

/** Profile saved: choose a country and Continue to Stripe. */
export const ProfileSaved: Story = {
  args: { line: { status: "not-bookable", missing: ["stripe"] }, profile: saved, payout: { status: "no-row", countries }, slots: noSlots },
  play: async ({ canvasElement }) => {
    await expect(primary(canvasElement).map((el) => el.textContent)).toEqual(["Continue to Stripe"]);
  },
};

/** Starting Stripe fails at the provider (502): the message stays, Retry setup is offered. */
export const StartFailed: Story = {
  args: { line: { status: "not-bookable", missing: ["stripe"] }, profile: saved, payout: { status: "reconciliation-required" }, slots: noSlots },
  parameters: { msw: [http.post(ONBOARDING, () => fail(502, "provider_unavailable", "We couldn't reach Stripe. Try again in a moment."))] },
};

/** Back from Stripe, still checking (?stripe=returned): Publish slots is the next thing to do. */
export const BackFromStripeChecking: Story = {
  args: {
    banner: "pending",
    line: { status: "not-bookable", missing: ["stripe"] },
    profile: saved,
    payout: { status: "pending", checkStatusHref: RETURN_ROUTE },
    slots: noSlots,
  },
  play: async ({ canvasElement }) => {
    await expect(primary(canvasElement).map((el) => el.textContent)).toEqual(["Publish slots"]);
  },
};

/** Back from Stripe, not finished. */
export const BackFromStripeIncomplete: Story = {
  args: { banner: "incomplete", line: { status: "not-bookable", missing: ["stripe"] }, profile: saved, payout: { status: "incomplete" }, slots: noSlots },
};

/** Stripe could not be reached when checking (?stripe=check_failed). */
export const CheckFailed: Story = {
  args: {
    banner: "check_failed",
    line: { status: "not-bookable", missing: ["stripe"] },
    profile: saved,
    payout: { status: "pending", checkStatusHref: RETURN_ROUTE },
    slots: { status: "some", upcoming: 3, booked: 0, manageHref: "/mentor/slots" },
  },
};

/** Blocked by Stripe: contacting the team is the one action. */
export const Blocked: Story = {
  args: { banner: "blocked", line: { status: "not-bookable", missing: ["stripe"] }, profile: saved, payout: { status: "blocked" }, slots: noSlots },
  play: async ({ canvasElement }) => {
    await expect(primary(canvasElement).map((el) => el.textContent)).toEqual(["Contact the DevMentor team"]);
  },
};

/** Bookable but no open slots: Publish slots. */
export const BookableNoSlots: Story = {
  args: { banner: "ready", line: { status: "no-slots" }, profile: saved, payout: { status: "ready" }, slots: noSlots },
};

/** Done: bookable, with the public link; no primary action. */
export const Bookable: Story = {
  args: {
    line: { status: "bookable", publicUrl: "https://devmentor.example/mentors/7f3c9b2e" },
    profile: saved,
    payout: { status: "ready" },
    slots: { status: "some", upcoming: 24, booked: 9, manageHref: "/mentor/slots" },
  },
  play: async ({ canvasElement }) => {
    await expect(primary(canvasElement)).toHaveLength(0);
  },
};

/** Phase 1: only the profile item. */
export const PhaseOne: Story = { args: { line: { status: "phase-1" }, payout: undefined, slots: undefined } };

/** 320 px. */
export const Narrow: Story = {
  globals: { viewport: { value: "w320", isRotated: false } },
  args: ProfileSaved.args,
  play: async ({ canvasElement }) => {
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth);
  },
};
