import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";

import { PasswordField } from "@devmentor/ui/frontend/forms/PasswordField";

import { Sample, StateTable } from "../../../.storybook/blocks/stories";

const meta = {
  title: "Primitives/Public/Password field",
  component: PasswordField,
  tags: ["!autodocs"],
  args: { name: "password", autoComplete: "new-password" },
  argTypes: {
    autoComplete: { control: "select", options: ["current-password", "new-password"] },
    errors: { control: "object" },
  },
  render: (args) => (
    <div className="max-w-text">
      <PasswordField {...args} />
    </div>
  ),
} satisfies Meta<typeof PasswordField>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Change the props in the Controls panel. The play test types a phrase, shows it with the toggle
 * and hides it again; the toggle reports its state with aria-pressed.
 */
export const Playground: Story = {
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText("Password");
    await userEvent.type(input, "correct horse battery staple");
    const toggle = canvas.getByRole("button", { name: "Show password" });
    await userEvent.click(toggle);
    await expect(input).toHaveAttribute("type", "text");
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(toggle);
    await expect(input).toHaveAttribute("type", "password");
  },
};

/** New password on /sign-up and /confirm-email; current password on /sign-in. */
export const Variants: Story = {
  render: () => (
    <div className="flex max-w-text flex-col gap-between-groups">
      <Sample label="new-password · /sign-up, AD6 hint before typing">
        <PasswordField autoComplete="new-password" />
      </Sample>
      <Sample label="current-password · /sign-in, no rule to repeat">
        <PasswordField autoComplete="current-password" hint={null} />
      </Sample>
    </div>
  ),
};

/** The toggle has its own focus; the input shows the error. Shown/hidden is tested in Playground. */
export const States: Story = {
  render: () => (
    <StateTable
      rows={[
        { state: "Default", children: <PasswordField /> },
        { state: "Focus", note: "frozen preview", children: <PasswordField data-preview-state="focus-visible" /> },
        { state: "Error", children: <PasswordField defaultValue="hunter2" errors={["Use at least 15 characters"]} /> },
        { state: "Disabled", note: "input and toggle", children: <PasswordField disabled hint="Locked while the form is sending." /> },
      ]}
    />
  ),
};

/** At 320 px the field takes the full width and the toggle stays inside it, 36 × 36 px. */
export const LongContentNarrow: Story = {
  globals: { viewport: { value: "w320", isRotated: false } },
  args: { defaultValue: "a short phrase that is easy to remember and long enough" },
  play: async ({ canvas, canvasElement }) => {
    await userEvent.tab();
    await expect(canvas.getByLabelText("Password")).toHaveFocus();
    await userEvent.tab();
    const toggle = canvas.getByRole("button", { name: "Show password" });
    await expect(toggle).toHaveFocus();
    const box = toggle.getBoundingClientRect();
    await expect(box.width).toBeGreaterThanOrEqual(24);
    await expect(box.height).toBeGreaterThanOrEqual(24);
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth);
  },
};
