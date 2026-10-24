import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent } from "storybook/test";

import { SubmitButton } from "@devmentor/ui/frontend/forms/SubmitButton";

import { Sample, StateTable } from "../../../.storybook/blocks/stories";

const meta = {
  title: "Primitives/Public/Submit button",
  component: SubmitButton,
  tags: ["!autodocs"],
  args: { children: "Sign in", pendingLabel: "Signing in…", pending: false },
  argTypes: { variant: { control: "select", options: ["default", "outline"] } },
} satisfies Meta<typeof SubmitButton>;

export default meta;
type Story = StoryObj<typeof meta>;

function SignInForm() {
  const [pending, setPending] = useState(false);
  return (
    <form
      className="max-w-text"
      onSubmit={(event) => {
        event.preventDefault();
        setPending(true);
      }}
    >
      <SubmitButton pending={pending} pendingLabel="Signing in…" className="w-full">
        Sign in
      </SubmitButton>
    </form>
  );
}

/** Change the props in the Controls panel. It is always type="submit". */
export const Playground: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Sign in" })).toHaveAttribute("type", "submit");
  },
};

/** default for the one main action; outline for a second form action (Resend confirmation). */
export const Variants: Story = {
  render: () => (
    <div className="flex flex-col gap-between-groups">
      <Sample label="default · the main action of the form">
        <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
      </Sample>
      <Sample label="outline · a secondary form, E01 email_not_confirmed">
        <SubmitButton variant="outline" pendingLabel="Resending…">Resend confirmation</SubmitButton>
      </Sample>
    </div>
  ),
};

/** Hover, focus and pressed are frozen with data-preview-state; pending is the real component. */
export const States: Story = {
  render: () => (
    <StateTable
      rows={[
        { state: "Default", children: <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton> },
        { state: "Hover", note: "frozen preview", children: <SubmitButton pendingLabel="Signing in…" data-preview-state="hover">Sign in</SubmitButton> },
        { state: "Focus", note: "frozen preview, keyboard only", children: <SubmitButton pendingLabel="Signing in…" data-preview-state="focus-visible">Sign in</SubmitButton> },
        { state: "Pending", note: "disabled, spinner, -ing label (P-C4)", children: <SubmitButton pending pendingLabel="Signing in…">Sign in</SubmitButton> },
        {
          state: "Outline: hover",
          note: "frozen preview",
          children: <SubmitButton variant="outline" pendingLabel="Resending…" data-preview-state="hover">Resend confirmation</SubmitButton>,
        },
      ]}
    />
  ),
};

/**
 * At 320 px the button takes the full width (P-C5). The play test submits with Enter and checks
 * that a second press cannot submit again.
 */
export const LongContentNarrow: Story = {
  globals: { viewport: { value: "w320", isRotated: false } },
  render: () => <SignInForm />,
  play: async ({ canvas, canvasElement }) => {
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    const button = canvas.getByRole("button", { name: "Signing in…" });
    await expect(button).toBeDisabled();
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth);
  },
};
