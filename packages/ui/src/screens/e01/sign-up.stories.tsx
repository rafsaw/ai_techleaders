import type { Meta, StoryObj } from "@storybook/react-vite";
import { delay, http } from "msw";
import { expect, fn, userEvent, waitFor } from "storybook/test";

import { apiCall } from "@devmentor/ui/api/apiCall";
import { N03_TITLE } from "@devmentor/ui/components/auth/SignInOptions";
import { SignUpForm } from "@devmentor/ui/components/auth/SignUpForm";

import { fail, ok, signUpSchema } from "../../../.storybook/blocks/fixtures";
import { Screen, screenParameters } from "../../../.storybook/blocks/screen";

const SIGN_UP = "/api/auth/sign-up";
const INVITE = encodeURIComponent("/invite/k7Qm2xV9pLr4");
/** The page's client navigation to Check your inbox (router.push). */
const navigate = fn();

/** /sign-up (E01 Flow 2): display name, email, password; N03 before typing; returnTo kept. */
function SignUpScreen({ invited = false }: { invited?: boolean }) {
  return (
    <Screen account={null} title="Create an account" width="text">
      <SignUpForm
        schema={signUpSchema}
        invited={invited}
        submit={(body, { signal }) =>
          apiCall<{ email: string; emailSent: boolean }>(SIGN_UP, { method: "POST", body: invited ? { ...body, returnTo: "/invite/k7Qm2xV9pLr4" } : body, signal })}
        onSignedUp={({ email, emailSent }) =>
          navigate(`/sign-up/check-email?email=${encodeURIComponent(email)}${emailSent ? "" : "&sent=0"}`)}
        signInHref={invited ? `/sign-in?returnTo=${INVITE}` : "/sign-in"}
      />
    </Screen>
  );
}

const meta = {
  title: "Screens/E01/Sign up",
  tags: ["!autodocs"],
  parameters: { ...screenParameters, msw: [http.post(SIGN_UP, () => ok({ email: "ada@example.com", emailSent: true }, 201))] },
  args: { invited: false },
  render: (args: { invited?: boolean }) => <SignUpScreen {...args} />,
} satisfies Meta<{ invited?: boolean }>;

export default meta;
type Story = StoryObj<typeof meta>;

type Canvas = Parameters<NonNullable<Story["play"]>>[0]["canvas"];
async function fill(canvas: Canvas) {
  await userEvent.type(canvas.getByRole("textbox", { name: "Display name" }), "Ada Nowak");
  await userEvent.type(canvas.getByRole("textbox", { name: "Email" }), "ada@example.com");
  await userEvent.type(canvas.getByLabelText("Password"), "correct horse battery staple");
}

/** Default: N03 and the password rule are visible before typing. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText(N03_TITLE)).toBeVisible();
    await expect(canvas.getByLabelText("Password")).toHaveAccessibleDescription(/15 characters/);
  },
};

/** From an invitation: says which address to use and keeps returnTo. */
export const FromInvitation: Story = {
  args: { invited: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: "Sign in instead" })).toHaveAttribute("href", `/sign-in?returnTo=${INVITE}`);
  },
};

/** Success: only after the server answers does the page move on to Check your inbox. */
export const Success: Story = {
  play: async ({ canvas }) => {
    await fill(canvas);
    await userEvent.click(canvas.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/sign-up/check-email?email=ada%40example.com"));
  },
};

/** Pending: Creating account…, no double submit. */
export const Pending: Story = {
  parameters: { msw: [http.post(SIGN_UP, async () => {
    await delay("infinite");
    return ok({});
  })] },
  play: async ({ canvas }) => {
    await fill(canvas);
    await userEvent.click(canvas.getByRole("button", { name: "Create account" }));
    await expect(canvas.getByRole("button", { name: "Creating account…" })).toBeDisabled();
  },
};

/** Validation: every error at once, focus on the first. */
export const Invalid: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Create account" }));
    await expect(canvas.getByRole("textbox", { name: "Display name" })).toHaveFocus();
    await expect(canvas.getByText("Use at least 15 characters")).toBeVisible();
  },
};

/** Not sent (SMTP failed or the per-address allowance is used up): the same answer, then the not-sent page. */
export const NotSent: Story = {
  parameters: { msw: [http.post(SIGN_UP, () => ok({ email: "ada@example.com", emailSent: false }, 201))] },
  play: async ({ canvas }) => {
    await fill(canvas);
    await userEvent.click(canvas.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/sign-up/check-email?email=ada%40example.com&sent=0"));
  },
};

/** Too many sign-ups from this network (429): the spec's message, values kept. */
export const RateLimited: Story = {
  parameters: { msw: [http.post(SIGN_UP, () => fail(429, "rate_limited", "Too many attempts. Try again later"))] },
  play: async ({ canvas }) => {
    await fill(canvas);
    await userEvent.click(canvas.getByRole("button", { name: "Create account" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent("Too many attempts. Try again later");
    await expect(canvas.getByRole("textbox", { name: "Email" })).toHaveValue("ada@example.com");
  },
};

/** No network. */
export const NetworkError: Story = {
  parameters: { msw: [http.post(SIGN_UP, () => Response.error())] },
  play: async ({ canvas }) => {
    await fill(canvas);
    await userEvent.click(canvas.getByRole("button", { name: "Create account" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent("Could not reach the server");
  },
};

/** 320 px. */
export const Narrow: Story = {
  globals: { viewport: { value: "w320", isRotated: false } },
  args: { invited: true },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth);
  },
};
