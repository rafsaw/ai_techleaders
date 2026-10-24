import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor } from "storybook/test";
import { z } from "zod";

import type { ApiResult } from "@devmentor/ui/backend/api/types";
import { ConfirmEmailPanel } from "@devmentor/ui/components/auth/ConfirmEmailPanel";

const schema = z.object({ password: z.string().min(1, "Enter your password") });
const confirm = {
  schema,
  submit: fn(async (): Promise<ApiResult<{ redirectTo: string }>> => ({ ok: true, data: { redirectTo: "/" } })),
  onConfirmed: fn(),
};

const meta = {
  title: "Product/E01 Accounts and access/Confirm email panel",
  component: ConfirmEmailPanel,
  tags: ["!autodocs"],
  args: { state: { status: "valid", email: "ada@example.com" }, signInHref: "/sign-in", confirm },
  argTypes: { confirm: { control: false } },
} satisfies Meta<typeof ConfirmEmailPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Valid link: the password confirms the address and signs in (E01 Flow 2, AD7). */
export const Playground: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.type(canvas.getByLabelText("Password"), "correct horse battery staple");
    await userEvent.click(canvas.getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(args.confirm.onConfirmed).toHaveBeenCalledWith("/"));
  },
};

/** Expired link: sign in to get a new one (the sign-in response offers Resend). */
export const Expired: Story = { args: { state: { status: "expired" } } };

/** Used link, address already confirmed. */
export const AlreadyConfirmed: Story = { args: { state: { status: "used" } } };

/** Unknown, tampered or replaced link: read at once (role="alert"). */
export const Invalid: Story = {
  args: { state: { status: "invalid" } },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("alert")).toHaveTextContent("This link isn't valid.");
    await expect(canvas.getByRole("link", { name: "Sign in" })).toBeVisible();
  },
};

/** Loading: Confirming… while the server checks. */
export const Pending: Story = {
  args: { confirm: { ...confirm, submit: fn(() => new Promise<ApiResult<{ redirectTo: string }>>(() => {})) } },
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByLabelText("Password"), "correct horse battery staple");
    await userEvent.click(canvas.getByRole("button", { name: "Confirm" }));
    await expect(canvas.getByRole("button", { name: "Confirming…" })).toBeDisabled();
  },
};

/** Error: a wrong password keeps the link usable and says so generically (401). */
export const WrongPassword: Story = {
  args: {
    confirm: {
      ...confirm,
      submit: fn(async (): Promise<ApiResult<{ redirectTo: string }>> => ({
        ok: false,
        error: { code: "invalid_credentials", message: "Email or password is incorrect" },
      })),
    },
  },
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByLabelText("Password"), "wrong horse battery staple");
    await userEvent.click(canvas.getByRole("button", { name: "Confirm" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent("Email or password is incorrect");
  },
};

/** Long content at 320 px: a long address breaks anywhere instead of widening the page. */
export const LongContentNarrow: Story = {
  globals: { viewport: { value: "w320", isRotated: false } },
  args: { state: { status: "valid", email: "aleksandra.wisniewska-konstantynowicz@engineering.example.com" } },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth);
  },
};
