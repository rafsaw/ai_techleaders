import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor } from "storybook/test";

import type { ApiResult } from "@devmentor/ui/backend/api/types";
import { PayoutStatus } from "@devmentor/ui/components/payments/PayoutStatus";

const countries = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "PL", name: "Poland" },
  { code: "CA", name: "Canada" },
];
const toStripe = fn(async (): Promise<ApiResult<{ url: string }>> => ({ ok: true, data: { url: "https://connect.stripe.com/setup/e/acct_1" } }));

const meta = {
  title: "Product/E02 Mentor setup/Payout status",
  component: PayoutStatus,
  tags: ["!autodocs"],
  args: { payout: { status: "no-row", countries }, startOnboarding: toStripe, onOnboardingUrl: fn(), contactHref: "mailto:team@devmentor.example" },
  argTypes: { startOnboarding: { control: false } },
  render: (args) => (
    <ol className="max-w-text">
      <PayoutStatus {...args} />
    </ol>
  ),
} satisfies Meta<typeof PayoutStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

/** No payout row yet: choose a country, then Continue to Stripe follows the returned link. */
export const Playground: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Continue to Stripe" }));
    await expect(canvas.getByText("Choose a country.")).toBeVisible();
    await userEvent.selectOptions(canvas.getByRole("combobox", { name: "Country" }), "PL");
    await userEvent.click(canvas.getByRole("button", { name: "Continue to Stripe" }));
    await waitFor(() => expect(args.onOnboardingUrl).toHaveBeenCalledWith("https://connect.stripe.com/setup/e/acct_1"));
  },
};

export const Locked: Story = { args: { payout: { status: "locked" } } };
export const StartingSetup: Story = { args: { payout: { status: "provisioning-pending" } } };
export const ReconciliationRequired: Story = { args: { payout: { status: "reconciliation-required" } } };
/** Setup failed: the action is Contact the DevMentor team, a real link styled as a button. */
export const SetupFailed: Story = {
  args: { payout: { status: "failed" } },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: "Contact the DevMentor team" })).toHaveClass("bg-primary");
    await expect(canvas.queryByRole("button")).toBeNull();
  },
};
export const Incomplete: Story = { args: { payout: { status: "incomplete" } } };
export const StripeChecking: Story = { args: { payout: { status: "pending", checkStatusHref: "/api/payments/onboarding/return" } } };
/** Blocked: the same contact action; in a checklist it is outline when it is not the primary (`next={false}`). */
export const Blocked: Story = { args: { payout: { status: "blocked" } } };
export const BlockedNotPrimary: Story = {
  args: { payout: { status: "blocked" }, next: false },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: "Contact the DevMentor team" })).not.toHaveClass("bg-primary");
  },
};
export const Confirmed: Story = { args: { payout: { status: "ready" } } };

/** Loading: the POST runs; the button is disabled with an -ing label. */
export const Pending: Story = {
  args: { payout: { status: "incomplete" }, startOnboarding: fn(() => new Promise<ApiResult<{ url: string }>>(() => {})) },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Continue with Stripe" }));
    await expect(canvas.getByRole("button", { name: "Opening Stripe…" })).toBeDisabled();
  },
};

/** Error: 409 while another start is running; the message stays and Retry setup is still there. */
export const StartConflict: Story = {
  args: {
    payout: { status: "provisioning-pending" },
    startOnboarding: fn(async (): Promise<ApiResult<{ url: string }>> => ({
      ok: false,
      error: { code: "conflict", message: "Stripe onboarding is already starting. Try again in a moment" },
    })),
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Retry setup" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent("Stripe onboarding is already starting.");
    await expect(canvas.getByRole("button", { name: "Retry setup" })).toBeEnabled();
  },
};

/** Long content at 320 px: the country hint and the select wrap; the button stays below. */
export const LongContentNarrow: Story = {
  globals: { viewport: { value: "w320", isRotated: false } },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth);
  },
};
