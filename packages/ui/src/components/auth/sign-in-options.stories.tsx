import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor } from "storybook/test";
import { z } from "zod";

import type { ApiResult } from "@devmentor/ui/api/types";
import { SignInOptions } from "@devmentor/ui/components/auth/SignInOptions";

// Story-only stand-in for signInSchema (E01 Phase 2): email and password, no returnTo.
const schema = z.object({ email: z.email("Enter a valid email address"), password: z.string().min(1, "Enter your password") });
const ok = { ok: true, data: { redirectTo: "/account" } } as const;
const fail = (code: string, message: string): ApiResult<never> => ({ ok: false, error: { code, message } });

const email = {
  schema,
  signIn: fn(async (): Promise<ApiResult<{ redirectTo: string }>> => ok),
  resend: fn(async () => ({ ok: true as const, data: { emailSent: true, alreadyConfirmed: false } })),
  onSignedIn: fn(),
  signUpHref: "/sign-up",
};

const meta = {
  title: "Product/E01 Accounts and access/Sign-in options",
  component: SignInOptions,
  tags: ["!autodocs"],
  args: { githubHref: "/api/auth/github", email },
  argTypes: {
    error: { control: "select", options: [undefined, "github_cancelled", "github_failed", "github_no_verified_email", "github_email_taken", "session_expired"] },
    email: { control: false },
  },
} satisfies Meta<typeof SignInOptions>;

export default meta;
type Story = StoryObj<typeof meta>;

async function signIn(canvas: Parameters<NonNullable<Story["play"]>>[0]["canvas"]) {
  await userEvent.type(canvas.getByRole("textbox", { name: "Email" }), "ada@example.com");
  await userEvent.type(canvas.getByLabelText("Password"), "correct horse battery staple");
  await userEvent.click(canvas.getByRole("button", { name: "Sign in" }));
}

/** Phase 2: GitHub first, the email form with N03, then the link to sign-up. Tab order follows. */
export const Playground: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.tab();
    await expect(canvas.getByRole("link", { name: "Sign in with GitHub" })).toHaveFocus();
    await signIn(canvas);
    await waitFor(() => expect(args.email!.onSignedIn).toHaveBeenCalledWith("/account"));
  },
};

/** Partial: Phase 1 ships GitHub only; the email form and the sign-up link are absent. */
export const GithubOnly: Story = { args: { email: undefined } };

/** Info: a presented session was rejected (SM-AC2); the page keeps the safe returnTo. Phase 1 (GitHub only). */
export const SessionExpired: Story = {
  args: { error: "session_expired", email: undefined },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("status")).toHaveTextContent("Your session expired.Sign in again.");
  },
};

/** Error: the four GitHub banners from ?error= (P-N1). Cancel is info, failures are errors. */
export const GithubCancelled: Story = {
  args: { error: "github_cancelled" },
  play: async ({ canvas }) => {
    // Phase 2: the banner links to the email form and puts the focus in its first field.
    await userEvent.click(canvas.getByRole("link", { name: "sign in with email" }));
    await expect(canvas.getByRole("textbox", { name: "Email" })).toHaveFocus();
  },
};
export const GithubFailed: Story = {
  args: { error: "github_failed" },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("alert")).toHaveTextContent("GitHub sign-in failed.Try again or sign in with email.");
  },
};
export const GithubNoVerifiedEmail: Story = { args: { error: "github_no_verified_email" } };
export const GithubEmailTaken: Story = { args: { error: "github_email_taken" } };

/** Loading: while the server checks, the button says Signing in… and cannot be pressed twice. */
export const Pending: Story = {
  args: { email: { ...email, signIn: fn(() => new Promise<ApiResult<{ redirectTo: string }>>(() => {})) } },
  play: async ({ canvas }) => {
    await signIn(canvas);
    await expect(canvas.getByRole("button", { name: "Signing in…" })).toBeDisabled();
  },
};

/** Error: wrong email or password gives one generic message (E01, 401). */
export const WrongPassword: Story = {
  args: { email: { ...email, signIn: fn(async () => fail("invalid_credentials", "Email or password is incorrect")) } },
  play: async ({ canvas }) => {
    await signIn(canvas);
    await expect(await canvas.findByRole("alert")).toHaveTextContent("Email or password is incorrect");
  },
};

/** Error with a next step: an unconfirmed address offers Resend confirmation (E01, 403). */
export const EmailNotConfirmed: Story = {
  args: { email: { ...email, signIn: fn(async () => fail("email_not_confirmed", "Confirm your email first")) } },
  play: async ({ args, canvas }) => {
    await signIn(canvas);
    await userEvent.click(await canvas.findByRole("button", { name: "Resend confirmation" }));
    await expect(await canvas.findByText("Check your inbox at ada@example.com")).toBeVisible();
    await expect(args.email!.resend).toHaveBeenCalledOnce();
  },
};

/** Resend outcomes: not sent (SMTP), and the address allowance used up (429), no countdown (SM-AC4). */
export const ResendNotSent: Story = {
  args: {
    email: {
      ...email,
      signIn: fn(async () => fail("email_not_confirmed", "Confirm your email first")),
      resend: fn(async () => ({ ok: true as const, data: { emailSent: false, alreadyConfirmed: false } })),
    },
  },
  play: async ({ canvas }) => {
    await signIn(canvas);
    await userEvent.click(await canvas.findByRole("button", { name: "Resend confirmation" }));
    await expect(await canvas.findByText("We couldn't send the email. Please try again later.")).toBeVisible();
  },
};
export const ResendRateLimited: Story = {
  args: {
    email: {
      ...email,
      signIn: fn(async () => fail("email_not_confirmed", "Confirm your email first")),
      resend: fn(async () => fail("rate_limited", "Too many attempts. Try again later")),
    },
  },
  play: async ({ canvas }) => {
    await signIn(canvas);
    await userEvent.click(await canvas.findByRole("button", { name: "Resend confirmation" }));
    await expect(await canvas.findByText("Too many attempts. Try again later")).toBeVisible();
  },
};

/** Long content at 320 px: the longest banner and N03 wrap; GitHub takes the full width. */
export const LongContentNarrow: Story = {
  globals: { viewport: { value: "w320", isRotated: false } },
  args: { error: "github_email_taken" },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth);
  },
};
