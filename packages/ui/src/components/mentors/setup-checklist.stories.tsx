import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";

import type { ApiResult } from "@devmentor/ui/backend/api/types";
import { SetupChecklist } from "@devmentor/ui/components/mentors/SetupChecklist";
import { PayoutStatus, type PayoutSetup } from "@devmentor/ui/components/payments/PayoutStatus";

// MD8: US, UK, EEA, Canada or Switzerland (a few shown).
const countries = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "PL", name: "Poland" },
  { code: "DE", name: "Germany" },
  { code: "CA", name: "Canada" },
  { code: "CH", name: "Switzerland" },
];

const payouts = (payout: PayoutSetup) => (
  <PayoutStatus
    payout={payout}
    startOnboarding={fn(async (): Promise<ApiResult<{ url: string }>> => ({ ok: true, data: { url: "https://connect.stripe.com/setup/e/acct_1" } }))}
    onOnboardingUrl={fn()}
    contactHref="mailto:team@devmentor.example"
  />
);

const saved = { status: "saved", editHref: "/mentor/profile", publicHref: "/mentors/7f3c9b2e" } as const;

const meta = {
  title: "Product/E02 Mentor setup/Setup checklist",
  component: SetupChecklist,
  tags: ["!autodocs"],
  args: { profile: { status: "not-started", createHref: "/mentor/profile" }, payouts: payouts({ status: "locked" }), slots: { status: "locked" } },
  argTypes: { payouts: { control: false } },
} satisfies Meta<typeof SetupChecklist>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Empty: a new mentor. Only Create your profile is possible; the rest says why it is locked. */
export const Playground: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole("listitem")).toHaveLength(3);
    await expect(canvas.getAllByText("Save your profile first.")).toHaveLength(2);
    await expect(canvas.getByRole("link", { name: "Create your profile" })).toBeVisible();
  },
};

/** Partial: profile saved; payouts need a country; no slots yet. */
export const ProfileSaved: Story = {
  args: { profile: saved, payouts: payouts({ status: "no-row", countries }), slots: { status: "none", manageHref: "/mentor/slots" } },
};

/** Waiting: Stripe is checking; slots published. */
export const StripeChecking: Story = {
  args: {
    profile: saved,
    payouts: payouts({ status: "pending", checkStatusHref: "/api/payments/onboarding/return" }),
    slots: { status: "some", upcoming: 3, booked: 1, manageHref: "/mentor/slots" },
  },
};

/** Done: every item confirmed; many slots. */
export const Complete: Story = {
  args: { profile: saved, payouts: payouts({ status: "ready" }), slots: { status: "some", upcoming: 24, booked: 9, manageHref: "/mentor/slots" } },
};

/** Error: Stripe blocked the account; the one action is to contact the team. */
export const Blocked: Story = {
  args: { profile: saved, payouts: payouts({ status: "blocked" }), slots: { status: "some", upcoming: 2, booked: 0, manageHref: "/mentor/slots" } },
};

/** Phase 1: only the profile item exists. */
export const PhaseOne: Story = { args: { payouts: undefined, slots: undefined } };

/** Long content at 320 px: long state texts wrap under the title; actions stack. */
export const LongContentNarrow: Story = {
  globals: { viewport: { value: "w320", isRotated: false } },
  args: { profile: saved, payouts: payouts({ status: "reconciliation-required" }), slots: { status: "some", upcoming: 128, booked: 64, manageHref: "/mentor/slots" } },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth);
  },
};
