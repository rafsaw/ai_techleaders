import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor } from "storybook/test";

import type { ApiResult } from "@devmentor/ui/api/types";
import { INVITED_NOTICE, SignUpForm, type SignUpOutcome } from "@devmentor/ui/components/auth/SignUpForm";

import { signUpSchema } from "../../../.storybook/blocks/fixtures";

const fail = (code: string, message: string): ApiResult<never> => ({ ok: false, error: { code, message } });

const meta = {
  title: "Product/E01 Accounts and access/Sign-up form",
  component: SignUpForm,
  tags: ["!autodocs"],
  args: {
    schema: signUpSchema,
    submit: fn(async (): Promise<ApiResult<SignUpOutcome>> => ({ ok: true, data: { email: "ada@example.com", emailSent: true } })),
    onSignedUp: fn(),
    signInHref: "/sign-in",
    invited: false,
  },
  argTypes: { schema: { control: false }, submit: { control: false } },
} satisfies Meta<typeof SignUpForm>;

export default meta;
type Story = StoryObj<typeof meta>;

type Canvas = Parameters<NonNullable<Story["play"]>>[0]["canvas"];
async function fill(canvas: Canvas) {
  await userEvent.type(canvas.getByRole("textbox", { name: "Display name" }), "Ada Nowak");
  await userEvent.type(canvas.getByRole("textbox", { name: "Email" }), "ada@example.com");
  await userEvent.type(canvas.getByLabelText("Password"), "a teapot on the windowsill");
  await userEvent.click(canvas.getByRole("button", { name: "Create account" }));
}

/** N03 and the 15-character rule before typing; the page moves on only after the server answered. */
export const Playground: Story = {
  play: async ({ args, canvas }) => {
    await expect(canvas.getByLabelText("Password")).toHaveAccessibleDescription(/15 characters/);
    await fill(canvas);
    await waitFor(() => expect(args.onSignedUp).toHaveBeenCalledWith({ email: "ada@example.com", emailSent: true }));
  },
};

/** From an invitation: which address to use. */
export const FromInvitation: Story = {
  args: { invited: true, signInHref: "/sign-in?returnTo=%2Finvite%2Fk7Qm2xV9pLr4" },
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole("status")[0]).toHaveTextContent(INVITED_NOTICE);
  },
};

/** Loading: Creating account…, no double submit. */
export const Pending: Story = {
  args: { submit: fn(() => new Promise<ApiResult<SignUpOutcome>>(() => {})) },
  play: async ({ canvas }) => {
    await fill(canvas);
    await expect(canvas.getByRole("button", { name: "Creating account…" })).toBeDisabled();
  },
};

/** Validation: every error at once, focus on the first. */
export const Invalid: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Create account" }));
    await expect(canvas.getByRole("textbox", { name: "Display name" })).toHaveFocus();
  },
};

/** Too many sign-ups from this network (429): the generic message, values kept. */
export const RateLimited: Story = {
  args: { submit: fn(async () => fail("rate_limited", "Too many attempts. Try again later")) },
  play: async ({ canvas }) => {
    await fill(canvas);
    await expect(await canvas.findByRole("alert")).toHaveTextContent("Too many attempts. Try again later");
    await expect(canvas.getByRole("textbox", { name: "Email" })).toHaveValue("ada@example.com");
  },
};

/** 320 px with the invitation notice. */
export const LongContentNarrow: Story = {
  globals: { viewport: { value: "w320", isRotated: false } },
  args: { invited: true },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth);
  },
};
