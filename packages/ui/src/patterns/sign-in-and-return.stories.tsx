import type { Meta, StoryObj } from "@storybook/react-vite";
import { http, HttpResponse } from "msw";
import { useState } from "react";
import { expect, fn, userEvent } from "storybook/test";
import { z } from "zod";

import { apiCall } from "@devmentor/ui/backend/api/apiCall";
import { InvitationPanel } from "@devmentor/ui/components/auth/InvitationPanel";
import { SignInOptions } from "@devmentor/ui/components/auth/SignInOptions";

// E01 Flow 3 with platform P6: /invite/<token> → /sign-in?returnTo=… → back to /invite/<token>.
const INVITE = "/invite/k7Qm2xV9pLr4";
const returnTo = encodeURIComponent(INVITE);
const SIGN_IN = "/api/auth/sign-in";

// Story-only stand-in for E01's signInSchema (not in core yet).
const signInSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

/** /sign-in with returnTo; after sign-in the page navigates to redirectTo, which re-checks the invitation. */
function SignInThenReturn() {
  const [back, setBack] = useState<string>();
  if (back) {
    return (
      <InvitationPanel
        state={{ status: "valid", displayName: "Ada Nowak", email: "ada@example.com", accept: fn(async () => ({ ok: true as const, data: {} })), onAccepted: fn() }}
      />
    );
  }
  return (
    <SignInOptions
      githubHref={`/api/auth/github?returnTo=${returnTo}`}
      email={{
        schema: signInSchema,
        signIn: (values) => apiCall<{ redirectTo: string }>(SIGN_IN, { method: "POST", body: { ...values, returnTo: INVITE } }),
        resend: fn(async () => ({ ok: true as const, data: { emailSent: true, alreadyConfirmed: false } })),
        onSignedIn: setBack,
        signUpHref: `/sign-up?returnTo=${returnTo}`,
      }}
    />
  );
}

const meta = {
  title: "Patterns/Sign-in and return",
  tags: ["!autodocs"],
  render: () => <SignInThenReturn />,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Step 1, signed out on the invitation: both ways in carry returnTo to this page. */
export const StartSignedOut: Story = {
  render: () => (
    <InvitationPanel state={{ status: "signed-out", signInHref: `/sign-in?returnTo=${returnTo}`, signUpHref: `/sign-up?returnTo=${returnTo}` }} />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", `/sign-in?returnTo=${returnTo}`);
    await expect(canvas.getByRole("link", { name: "Create an account" })).toHaveAttribute("href", `/sign-up?returnTo=${returnTo}`);
  },
};

/** Step 2, sign-in keeps returnTo in every way out: GitHub, the email form and Create an account. */
export const Playground: Story = {
  parameters: { msw: [http.post(SIGN_IN, () => HttpResponse.json({ ok: true, data: { redirectTo: INVITE } }))] },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: "Sign in with GitHub" })).toHaveAttribute("href", `/api/auth/github?returnTo=${returnTo}`);
    await expect(canvas.getByRole("link", { name: "Create an account" })).toHaveAttribute("href", `/sign-up?returnTo=${returnTo}`);
  },
};

/** Step 3, back on the invitation: the page re-checks the token and the account before offering Accept. */
export const Returned: Story = {
  parameters: { msw: [http.post(SIGN_IN, () => HttpResponse.json({ ok: true, data: { redirectTo: INVITE } }))] },
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByRole("textbox", { name: "Email" }), "ada@example.com");
    await userEvent.type(canvas.getByLabelText("Password"), "correct horse battery staple");
    await userEvent.click(canvas.getByRole("button", { name: "Sign in" }));
    await expect(await canvas.findByRole("button", { name: "Accept invitation" })).toBeVisible();
  },
};

/** Error: a wrong password keeps the person on /sign-in with returnTo still in place. */
export const WrongPassword: Story = {
  parameters: {
    msw: [http.post(SIGN_IN, () => HttpResponse.json({ ok: false, error: { code: "invalid_credentials", message: "Email or password is incorrect" } }, { status: 401 }))],
  },
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByRole("textbox", { name: "Email" }), "ada@example.com");
    await userEvent.type(canvas.getByLabelText("Password"), "wrong horse battery staple");
    await userEvent.click(canvas.getByRole("button", { name: "Sign in" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent("Email or password is incorrect");
    await expect(canvas.getByRole("link", { name: "Sign in with GitHub" })).toHaveAttribute("href", `/api/auth/github?returnTo=${returnTo}`);
  },
};

/** The invitation changed meanwhile (expired, revoked): returning shows the page's current state, never a stale one. */
export const ReturnedToInvalid: Story = {
  render: () => <InvitationPanel state={{ status: "invalid" }} />,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("alert")).toHaveTextContent("This invitation is not valid.");
  },
};
