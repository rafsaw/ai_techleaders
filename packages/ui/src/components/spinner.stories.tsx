import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";
import { useState } from "react";

import { Button } from "@devmentor/ui/components/button";
import { Spinner } from "@devmentor/ui/components/spinner";

import { Sample, StateTable } from "../../.storybook/blocks/stories";

const meta = {
  title: "Primitives/Signed-in/Spinner",
  component: Spinner,
  tags: ["!autodocs"],
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Alone, the spinner is a status named "Loading". Next to a text label, hide it (see Sizes). */
export const Playground: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("status", { name: "Loading" })).toBeVisible();
  },
};

/** 16 px by default (icons 16/14/12); it takes the colour of the text around it. */
export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-between-groups">
      <Sample label="16 px · default, in buttons and LoadingMessage">
        <Spinner />
      </Sample>
      <Sample label="14 px · size-3.5, in a small button">
        <Spinner className="size-3.5" />
      </Sample>
      <Sample label="in a button · aria-hidden, the label says what happens">
        <Button disabled>
          <Spinner aria-hidden />
          Publishing slot…
        </Button>
      </Sample>
      <Sample label="in a destructive button">
        <Button variant="destructive" disabled>
          <Spinner aria-hidden />
          Removing slot…
        </Button>
      </Sample>
    </div>
  ),
};

/**
 * A spinner has one state: spinning. With reduced motion it stands still (Q4); the text
 * next to it still says that work is in progress.
 */
export const States: Story = {
  render: () => (
    <StateTable
      rows={[
        { state: "Idle", note: "no spinner", children: <Button>Continue to Stripe</Button> },
        {
          state: "Loading",
          note: "button disabled, spinner, -ing label (P-C4)",
          children: (
            <Button disabled>
              <Spinner aria-hidden />
              Starting Stripe setup…
            </Button>
          ),
        },
      ]}
    />
  ),
};

function ContinueToStripeButton() {
  const [starting, setStarting] = useState(false);
  return (
    <Button className="w-full" disabled={starting} onClick={() => setStarting(true)}>
      {starting ? (
        <>
          <Spinner aria-hidden />
          Starting Stripe setup…
        </>
      ) : (
        "Continue to Stripe"
      )}
    </Button>
  );
}

/**
 * At 320 px a button with a spinner takes the full width (P-C5); the spinner sits before the
 * label. The play test clicks it and checks the label is read once and the spinner not at all.
 */
export const LongContentNarrow: Story = {
  globals: { viewport: { value: "w320", isRotated: false } },
  render: () => <ContinueToStripeButton />,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Continue to Stripe" }));
    const button = canvas.getByRole("button", { name: "Starting Stripe setup…" });
    await expect(button).toBeDisabled();
    await expect(canvas.queryByRole("status")).toBeNull();
  },
};
