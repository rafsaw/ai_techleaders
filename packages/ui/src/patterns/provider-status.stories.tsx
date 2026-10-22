import type { Meta, StoryObj } from "@storybook/react-vite";
import { CircleCheckIcon, InfoIcon, OctagonXIcon, TriangleAlertIcon } from "lucide-react";
import { http, HttpResponse } from "msw";
import { expect, fn, userEvent, within } from "storybook/test";

import { apiCall } from "@devmentor/ui/backend/api/apiCall";
import { Alert, AlertDescription, AlertTitle } from "@devmentor/ui/components/alert";
import { buttonVariants } from "@devmentor/ui/components/button";
import { SetupChecklist } from "@devmentor/ui/components/mentors/SetupChecklist";
import type { PayoutSetup } from "@devmentor/ui/components/payments/PayoutStatus";

const RETURN = "/api/payments/onboarding/return";
const ONBOARDING = "/api/payments/onboarding";

// The banners on /mentor?stripe=returned and ?stripe=check_failed (E02 Flow 3 step 6). Copy is the
// spec's; the variants follow the approved status mapping (badge.mdx): P-PS1, proposal.
const banners = {
  ready: { variant: "success", Icon: CircleCheckIcon, role: "status", title: "Stripe confirmed your account.", body: undefined },
  pending: {
    variant: "default",
    Icon: InfoIcon,
    role: "status",
    title: "Stripe is checking your details.",
    body: "This can take a few minutes to a few business days.",
  },
  incomplete: { variant: "warning", Icon: TriangleAlertIcon, role: "status", title: "Stripe onboarding isn't finished.", body: "Continue where you left off." },
  blocked: { variant: "destructive", Icon: OctagonXIcon, role: "alert", title: "Stripe can't enable payouts for this account.", body: "Contact the DevMentor team." },
  check_failed: {
    variant: "destructive",
    Icon: OctagonXIcon,
    role: "alert",
    title: "We couldn't reach Stripe to check your status.",
    // The spec's second sentence, "Try checking again.", is the link itself.
    body: undefined,
  },
} as const;

type Banner = keyof typeof banners;

function MentorAfterStripe({ banner, payout }: { banner?: Banner; payout: PayoutSetup }) {
  const shown = banner ? banners[banner] : undefined;
  return (
    <main className="flex w-full max-w-text flex-col gap-component">
      {shown ? (
        <Alert variant={shown.variant} role={shown.role}>
          <shown.Icon aria-hidden />
          <AlertTitle>{shown.title}</AlertTitle>
          {shown.body ? <AlertDescription>{shown.body}</AlertDescription> : null}
          {banner === "check_failed" ? (
            <AlertDescription>
              <a href={RETURN} className={buttonVariants({ variant: "secondary", size: "sm" })}>Try checking again</a>
            </AlertDescription>
          ) : null}
        </Alert>
      ) : null}
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
