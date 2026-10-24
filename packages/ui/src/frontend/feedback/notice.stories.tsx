import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { Notice } from "@devmentor/ui/frontend/feedback/Notice";
import { LinkButton } from "@devmentor/ui/frontend/actions/LinkButton";

import { StateTable } from "../../../.storybook/blocks/stories";

// Copy from E01 (2026-10-17-accounts-and-roles.md): Flow 2 (N03, check inbox), edge cases.
const N03 =
  "Save your password in a password manager, or use GitHub sign-in. If you forget an email-only account's password, you cannot recover access in version 1.0.";

const meta = {
  title: "Primitives/Public/Notice",
  component: Notice,
  tags: ["!autodocs"],
  args: { variant: "info", title: "Password reset is not available yet.", children: N03 },
  argTypes: { variant: { control: "select", options: ["info", "success", "error"] } },
  render: (args) => (
    <div className="max-w-text">
      <Notice {...args} />
    </div>
  ),
} satisfies Meta<typeof Notice>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Change the props in the Controls panel. Info and success are read politely (role="status"). */
export const Playground: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("status")).toHaveTextContent("Password reset is not available yet.");
  },
};

/** The three variants with E01 copy; the error is read at once (role="alert"). */
export const Variants: Story = {
  render: () => (
    <div className="flex max-w-text flex-col gap-between-groups">
      <Notice title="Password reset is not available yet.">{N03}</Notice>
      <Notice variant="success" title="Check your inbox at ada@example.com">
        The link expires in 24 hours.
      </Notice>
      <Notice variant="error" title="GitHub sign-in failed.">
        <p>Try again or sign in with email.</p>
        <LinkButton href="/api/auth/github" variant="outline">Sign in with GitHub</LinkButton>
      </Notice>
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("alert")).toHaveTextContent("GitHub sign-in failed.");
    await expect(canvas.getAllByRole("status")).toHaveLength(2);
  },
};

/** A notice is not interactive; a link or button inside it has its own states (focus frozen here). */
export const States: Story = {
  render: () => (
    <StateTable
      rows={[
        {
          state: "With action focused",
          note: "frozen preview",
          children: (
            <Notice variant="error" title="We couldn't send the email — try again">
              <LinkButton href="/sign-in" variant="link" data-preview-state="focus-visible">Sign in</LinkButton>
            </Notice>
          ),
        },
      ]}
    />
  ),
};

/** At 320 px text wraps next to the icon; the page never scrolls sideways. */
export const LongContentNarrow: Story = {
  globals: { viewport: { value: "w320", isRotated: false } },
  args: { variant: "error", title: "An account with this email is linked to a different GitHub account.", children: N03 },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByRole("alert")).toBeVisible();
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth);
  },
};
