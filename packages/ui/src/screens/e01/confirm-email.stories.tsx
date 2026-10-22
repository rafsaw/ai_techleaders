import type { Meta, StoryObj } from "@storybook/react-vite";
import { delay, http } from "msw";
import { expect, fn, userEvent, waitFor } from "storybook/test";
import { z } from "zod";

import { apiCall } from "@devmentor/ui/backend/api/apiCall";
import { ConfirmEmailPanel, type ConfirmEmailState } from "@devmentor/ui/components/auth/ConfirmEmailPanel";

import { fail, ok } from "../../../.storybook/blocks/fixtures";
import { Screen, screenParameters } from "../../../.storybook/blocks/screen";

const CONFIRM = "/api/auth/confirm-email";
const navigate = fn();

/** /confirm-email?token=… (E01 Flow 2, AD7): the GET only inspects; Confirm posts the password. */
function ConfirmEmailScreen({ state }: { state: ConfirmEmailState }) {
  return (
    <Screen account={null} title="Confirm your email" width="text">
      <ConfirmEmailPanel
        state={state}
        signInHref="/sign-in"
        confirm={{
          schema: z.object({ password: z.string().min(1, "Enter your password") }),
          submit: ({ password }) => apiCall<{ redirectTo: string }>(CONFIRM, { method: "POST", body: { token: "q8Zt3", password } }),
          onConfirmed: navigate,
        }}
      />
    </Screen>
  );
}

const meta = {
  title: "Screens/E01/Confirm email",
  tags: ["!autodocs"],
  parameters: { ...screenParameters, msw: [http.post(CONFIRM, () => ok({ redirectTo: "/account?welcome=1" }))] },
  args: { state: { status: "valid", email: "ada@example.com" } },
  render: (args: { state: ConfirmEmailState }) => <ConfirmEmailScreen {...args} />,
} satisfies Meta<{ state: ConfirmEmailState }>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Valid link: the password confirms and signs in. */
export const Valid: Story = {
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByLabelText("Password"), "correct horse battery staple");
    await userEvent.click(canvas.getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/account?welcome=1"));
  },
};

/** Confirming: Confirming…. */
export const Pending: Story = {
  parameters: { msw: [http.post(CONFIRM, async () => {
    await delay("infinite");
    return ok({});
  })] },
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByLabelText("Password"), "correct horse battery staple");
    await userEvent.click(canvas.getByRole("button", { name: "Confirm" }));
    await expect(canvas.getByRole("button", { name: "Confirming…" })).toBeDisabled();
  },
};

/** Wrong password (401): the link stays usable. */
export const WrongPassword: Story = {
  parameters: { msw: [http.post(CONFIRM, () => fail(401, "invalid_credentials", "Email or password is incorrect"))] },
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByLabelText("Password"), "wrong horse battery staple");
    await userEvent.click(canvas.getByRole("button", { name: "Confirm" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent("Email or password is incorrect");
  },
};

/** Expired link. */
export const Expired: Story = { args: { state: { status: "expired" } } };

/** Already used: the address is confirmed. */
export const AlreadyConfirmed: Story = { args: { state: { status: "used" } } };

/** Unknown or replaced link. */
export const Invalid: Story = { args: { state: { status: "invalid" } } };

/** A long address at 320 px. */
export const Narrow: Story = {
  globals: { viewport: { value: "w320", isRotated: false } },
  args: { state: { status: "valid", email: "aleksandra.wisniewska-konstantynowicz@engineering.example.com" } },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth);
  },
};
