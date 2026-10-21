import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";

import { TextField } from "@devmentor/ui/frontend/forms/TextField";

import { Sample, StateTable } from "../../../.storybook/blocks/stories";

const meta = {
  title: "Primitives/Public/Text field",
  component: TextField,
  tags: ["!autodocs"],
  args: { label: "Email", type: "email", autoComplete: "email", name: "email" },
  argTypes: {
    type: { control: "select", options: ["text", "email"] },
    hint: { control: "text" },
    errors: { control: "object" },
  },
  render: (args) => (
    <div className="max-w-text">
      <TextField {...args} />
    </div>
  ),
} satisfies Meta<typeof TextField>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Change the props in the Controls panel. The label is always visible and names the input. */
export const Playground: Story = {
  play: async ({ canvas }) => {
    const input = canvas.getByRole("textbox", { name: "Email" });
    await userEvent.type(input, "ada@example.com");
    await expect(input).toHaveValue("ada@example.com");
  },
};

/** Text and email inputs, with and without a hint (the fields of /sign-up, E01). */
export const Variants: Story = {
  render: () => (
    <div className="flex max-w-text flex-col gap-between-groups">
      <Sample label="type text · display name">
        <TextField label="Display name" autoComplete="name" hint="This is the name others see. You can change it." />
      </Sample>
      <Sample label="type email">
        <TextField label="Email" type="email" autoComplete="email" />
      </Sample>
    </div>
  ),
};

/** Hover keeps the input as it is (C7); focus is frozen with data-preview-state. */
export const States: Story = {
  render: () => (
    <StateTable
      rows={[
        { state: "Default", children: <TextField label="Email" type="email" /> },
        { state: "Filled", children: <TextField label="Email" type="email" defaultValue="ada@example.com" /> },
        { state: "Focus", note: "frozen preview, keyboard only", children: <TextField label="Email" type="email" data-preview-state="focus-visible" /> },
        {
          state: "Error",
          note: "red border and the message under it",
          children: <TextField label="Email" type="email" defaultValue="ada@" errors={["Enter a valid email address"]} />,
        },
        {
          state: "Disabled",
          note: "own colours, reason in the hint (B2); not used on E01 pages: a fixed value is text (P-C6)",
          children: <TextField label="Email" type="email" defaultValue="ada@example.com" disabled hint="Locked while the form is sending." />,
        },
      ]}
    />
  ),
};

/**
 * At 320 px the field takes the full width; a long value scrolls inside the input, the hint and
 * the error wrap under it. Tab reaches the input and the error is part of its description.
 */
export const LongContentNarrow: Story = {
  globals: { viewport: { value: "w320", isRotated: false } },
  args: {
    label: "Display name",
    type: "text",
    defaultValue: "Aleksandra Wiśniewska-Konstantynowicz",
    hint: "This is the name others see. You can change it.",
    errors: ["Use 1–100 characters."],
  },
  play: async ({ canvas, canvasElement }) => {
    await userEvent.tab();
    const input = canvas.getByRole("textbox", { name: "Display name" });
    await expect(input).toHaveFocus();
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(input).toHaveAccessibleDescription(expect.stringContaining("Use 1–100 characters."));
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth);
  },
};
