import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { CheckEmailNotice, EMAIL_NOT_SENT } from "@devmentor/ui/components/auth/CheckEmailNotice";
import { LinkButton } from "@devmentor/ui/frontend/actions/LinkButton";

import { Screen, screenParameters } from "../../../.storybook/blocks/screen";

/** /sign-up/check-email (E01 Flow 2): the same page whether or not the address already had an account. */
function CheckEmailScreen({ email, emailSent }: { email: string; emailSent: boolean }) {
  return (
    <Screen account={null} title="Check your email" width="text">
      <CheckEmailNotice email={email} emailSent={emailSent} />
      {emailSent ? (
        <LinkButton href="/sign-in" variant="link" className="self-start">
          Sign in
        </LinkButton>
      ) : (
        <LinkButton href="/sign-up" className="self-start">
          Back to sign-up
        </LinkButton>
      )}
    </Screen>
  );
}

const meta = {
  title: "Screens/E01/Check email",
  tags: ["!autodocs"],
  parameters: screenParameters,
  args: { email: "ada@example.com", emailSent: true },
  render: (args: { email: string; emailSent: boolean }) => <CheckEmailScreen {...args} />,
} satisfies Meta<{ email: string; emailSent: boolean }>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Sent: where to look and how long the link works. */
export const Sent: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("status")).toHaveTextContent("Check your inbox at ada@example.com");
    await expect(canvas.getByText("The link expires in 24 hours.")).toBeVisible();
  },
};

/** Not sent (SMTP failed or the per-address limit is used up): no cause, no retry control, a way back to sign-up (SM-AC3). */
export const NotSent: Story = {
  args: { emailSent: false },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("alert")).toHaveTextContent(EMAIL_NOT_SENT);
    await expect(canvas.getByRole("link", { name: "Back to sign-up" })).toHaveAttribute("href", "/sign-up");
  },
};

/** A long address at 320 px. */
export const Narrow: Story = {
  globals: { viewport: { value: "w320", isRotated: false } },
  args: { email: "aleksandra.wisniewska-konstantynowicz@engineering.example.com" },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth);
  },
};
