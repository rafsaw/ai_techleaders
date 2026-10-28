import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { CHECK_EMAIL_EXPIRY, CheckEmailNotice, EMAIL_NOT_SENT } from "@devmentor/ui/components/auth/CheckEmailNotice";

const meta = {
  title: "Product/E01 Accounts and access/Check email notice",
  component: CheckEmailNotice,
  tags: ["!autodocs"],
  args: { email: "ada@example.com", emailSent: true },
} satisfies Meta<typeof CheckEmailNotice>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Sent: where the link went and how long it works (E01 UI/UX `/sign-up/check-email`). */
export const Playground: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("status")).toHaveTextContent("Check your inbox at ada@example.com");
    await expect(canvas.getByText(CHECK_EMAIL_EXPIRY)).toBeVisible();
  },
};

/** Not sent (SMTP failed, or the per-address allowance is used up): no cause, no countdown (SM-AC3, SM-AC4). */
export const NotSent: Story = {
  args: { emailSent: false },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("alert")).toHaveTextContent(EMAIL_NOT_SENT);
  },
};

/** A long address at 320 px breaks anywhere. */
export const LongContentNarrow: Story = {
  globals: { viewport: { value: "w320", isRotated: false } },
  args: { email: "aleksandra.wisniewska-konstantynowicz@engineering.example.com" },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth);
  },
};
