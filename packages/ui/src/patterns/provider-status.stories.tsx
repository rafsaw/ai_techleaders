import type { Meta, StoryObj } from "@storybook/react-vite";
import { http, HttpResponse } from "msw";
import { expect, fn, userEvent, within } from "storybook/test";

import { apiCall } from "@devmentor/ui/backend/api/apiCall";
import { SetupChecklist } from "@devmentor/ui/components/mentors/SetupChecklist";
import type { PayoutSetup } from "@devmentor/ui/components/payments/PayoutStatus";

import { RETURN_ROUTE, STRIPE_BANNERS as banners, StripeBanner } from "../../.storybook/blocks/stripe-banner";

const RETURN = RETURN_ROUTE;
const ONBOARDING = "/api/payments/onboarding";

type Banner = keyof typeof banners;

function MentorAfterStripe({ banner, payout }: { banner?: Banner; payout: PayoutSetup }) {
  return (
    <main className="flex w-full max-w-text flex-col gap-component">
      {banner ? <StripeBanner banner={banner} /> : null}
      <SetupChecklist
        profile={{ status: "saved", editHref: "/mentor/profile", publicHref: "/mentors/7f3c9b2e" }}
        payouts={{
          payout,
          startOnboarding: (body) => apiCall<{ url: string }>(ONBOARDING, { method: "POST", body }),
          onOnboardingUrl: fn(),
          contactHref: "mailto:team@devmentor.example",
        }}
      />
    </main>
  );
}

const meta = {
  title: "Patterns/Provider status",
  tags: ["!autodocs"],
  args: { banner: "pending", payout: { status: "pending", checkStatusHref: RETURN } },
  argTypes: { banner: { control: "select", options: Object.keys(banners) } },
  render: (args: { banner?: Banner; payout: PayoutSetup }) => <MentorAfterStripe {...args} />,
} satisfies Meta<{ banner?: Banner; payout: PayoutSetup }>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Back from Stripe, still checking: the banner says so; Check status asks Stripe again (no query trust). */
export const Playground: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("status")).toHaveTextContent("Stripe is checking your details.");
    await expect(canvas.getByRole("link", { name: "Check status" })).toHaveAttribute("href", RETURN);
  },
};

/** Confirmed by Stripe after a fresh fetch. */
export const Confirmed: Story = { args: { banner: "ready", payout: { status: "ready" } } };

/** Not finished at Stripe: continue where you left off. */
export const Incomplete: Story = {
  args: { banner: "incomplete", payout: { status: "incomplete" } },
  parameters: { msw: [http.post(ONBOARDING, () => HttpResponse.json({ ok: true, data: { url: "https://connect.stripe.com/setup/e/acct_1" } }))] },
};

/** Blocked: only the team can help. */
export const Blocked: Story = { args: { banner: "blocked", payout: { status: "blocked" } } };

/** Stripe unreachable when checking: say so, keep the last known state, offer Try checking again. */
export const CheckFailed: Story = {
  args: { banner: "check_failed", payout: { status: "pending", checkStatusHref: RETURN } },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("alert")).toHaveTextContent("We couldn't reach Stripe to check your status.");
    await expect(canvas.getByRole("link", { name: "Try checking again" })).toHaveAttribute("href", RETURN);
    await expect(canvas.getByText("Pending")).toBeVisible();
  },
};

/** Starting fails at the provider (502): the message stays and Retry setup is offered. */
export const StartFailed: Story = {
  args: { banner: undefined, payout: { status: "reconciliation-required" } },
  parameters: {
    msw: [http.post(ONBOARDING, () =>
      HttpResponse.json({ ok: false, error: { code: "provider_unavailable", message: "We couldn't reach Stripe. Try again in a moment." } }, { status: 502 }),
    )],
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Retry setup" }));
    const item = canvas.getAllByRole("listitem")[1]!;
    await expect(await within(item).findByText("We couldn't reach Stripe. Try again in a moment.")).toBeVisible();
    await expect(within(item).getByRole("button", { name: "Retry setup" })).toBeEnabled();
  },
};

/** 320 px: banner and item stack. */
export const Narrow: Story = {
  globals: { viewport: { value: "w320", isRotated: false } },
  args: { banner: "check_failed", payout: { status: "pending", checkStatusHref: RETURN } },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth);
  },
};
