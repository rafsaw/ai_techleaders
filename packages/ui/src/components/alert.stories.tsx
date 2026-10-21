import type { Meta, StoryObj } from "@storybook/react-vite";
import { CircleCheckIcon, InfoIcon, OctagonXIcon, TriangleAlertIcon } from "lucide-react";
import { expect } from "storybook/test";

import { Alert, AlertDescription, AlertTitle } from "@devmentor/ui/components/alert";
import { Button } from "@devmentor/ui/components/button";

const meta = {
  title: "Primitives/Signed-in/Alert",
  component: Alert,
  tags: ["!autodocs"],
  args: { variant: "default", role: "status" },
  argTypes: {
    variant: { control: "select", options: ["default", "success", "warning", "destructive"] },
    role: { control: "select", options: ["status", "alert"] },
  },
  render: (args) => (
    <Alert {...args} className="max-w-text">
      <InfoIcon aria-hidden />
      <AlertTitle>Stripe is checking your details.</AlertTitle>
      <AlertDescription>This can take a few minutes to a few business days.</AlertDescription>
    </Alert>
  ),
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Change the props in the Controls panel. News that needs no action uses role="status". */
export const Playground: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("status")).toHaveTextContent("Stripe is checking your details.");
  },
};

/** The four /mentor banners after returning from Stripe (E02 Flow 3, step 6) and the check error. */
export const Variants: Story = {
  render: () => (
    <div className="flex max-w-text flex-col gap-between-groups">
      <Alert variant="success" role="status">
        <CircleCheckIcon aria-hidden />
        <AlertTitle>Stripe confirmed your account.</AlertTitle>
        <AlertDescription>You are bookable.</AlertDescription>
      </Alert>
      <Alert role="status">
        <InfoIcon aria-hidden />
        <AlertTitle>Stripe is checking your details.</AlertTitle>
        <AlertDescription>
          <p>This can take a few minutes to a few business days.</p>
          <Button variant="secondary" size="sm">Check status</Button>
        </AlertDescription>
      </Alert>
      <Alert variant="warning">
        <TriangleAlertIcon aria-hidden />
        <AlertTitle>Stripe onboarding isn&apos;t finished.</AlertTitle>
        <AlertDescription>
          <p>Continue where you left off.</p>
          <Button size="sm">Continue with Stripe</Button>
        </AlertDescription>
      </Alert>
      <Alert variant="destructive">
        <OctagonXIcon aria-hidden />
        <AlertTitle>Stripe can&apos;t enable payouts for this account.</AlertTitle>
        <AlertDescription>
          Contact the DevMentor team.
        </AlertDescription>
      </Alert>
      <Alert variant="destructive">
        <OctagonXIcon aria-hidden />
        <AlertTitle>We couldn&apos;t reach Stripe to check your status.</AlertTitle>
        <AlertDescription>
          <Button variant="link" size="sm" className="px-0">Try checking again</Button>
        </AlertDescription>
      </Alert>
    </div>
  ),
};

/** An error that needs action uses role="alert" (read at once); the action is a real button inside. */
export const ErrorWithAction: Story = {
  render: () => (
    <Alert variant="destructive" className="max-w-text">
      <OctagonXIcon aria-hidden />
      <AlertTitle>We couldn&apos;t reach Stripe to check your status.</AlertTitle>
      <AlertDescription>
        <Button variant="link" size="sm" className="px-0">Try checking again</Button>
      </AlertDescription>
    </Alert>
  ),
  play: async ({ canvas }) => {
    const alert = canvas.getByRole("alert");
    await expect(alert).toHaveTextContent("We couldn't reach Stripe to check your status.");
    await expect(canvas.getByRole("button", { name: "Try checking again" })).toBeVisible();
  },
};

/** Without an icon the text spans the full width. Every variant still has a title in words. */
export const WithoutIcon: Story = {
  render: () => (
    <Alert role="status" className="max-w-text">
      <AlertTitle>This is the name others see. You can change it.</AlertTitle>
    </Alert>
  ),
};

/**
 * An alert is not interactive: hover, focus and pressed belong to the button inside it.
 * The only states are its variants (see Variants) and its presence.
 */
export const States: Story = {
  render: () => (
    <div className="flex max-w-text flex-col gap-between-groups">
      <Alert variant="warning">
        <TriangleAlertIcon aria-hidden />
        <AlertTitle>Stripe onboarding isn&apos;t finished.</AlertTitle>
        <AlertDescription>
          <p>Continue where you left off.</p>
          <Button size="sm" data-preview-state="focus-visible">Continue with Stripe</Button>
        </AlertDescription>
      </Alert>
    </div>
  ),
};

/** At 320 px text wraps under the title; the action sits below the text, not beside it. */
export const LongContentNarrow: Story = {
  globals: { viewport: { value: "w320", isRotated: false } },
  render: () => (
    <Alert role="status">
      <InfoIcon aria-hidden />
      <AlertTitle>Stripe is checking your details.</AlertTitle>
      <AlertDescription>
        <p>This can take a few minutes to a few business days.</p>
        <Button variant="secondary" size="sm" className="w-full">Check status</Button>
      </AlertDescription>
    </Alert>
  ),
};
