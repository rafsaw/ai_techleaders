import type { Meta, StoryObj } from "@storybook/react-vite";
import { delay, http } from "msw";
import { expect, fn, userEvent, within } from "storybook/test";

import { apiCall } from "@devmentor/ui/backend/api/apiCall";
import { SignInOptions, type GithubErrorCode } from "@devmentor/ui/components/auth/SignInOptions";

import { fail, ok, signInSchema } from "../../../.storybook/blocks/fixtures";
import { Screen, screenParameters } from "../../../.storybook/blocks/screen";

const SIGN_IN = "/api/auth/sign-in";
const RESEND = "/api/auth/confirm-email/resend";

/** /sign-in (E01 Flow 1–2): GitHub first, then email; banners from ?error=. */
function SignInScreen({ error, phase = 2 }: { error?: GithubErrorCode; phase?: 1 | 2 }) {
  return (
    <Screen account={null} title="Sign in" width="text">
      <SignInOptions
        githubHref="/api/auth/github"
        error={error}
        email={
          phase === 2
            ? {
                schema: signInSchema,
                signIn: (body) => apiCall<{ redirectTo: string }>(SIGN_IN, { method: "POST", body }),
                resend: (body) => apiCall(RESEND, { method: "POST", body }),
                onSignedIn: fn(),
                signUpHref: "/sign-up",
              }
            : undefined
        }
      />
    </Screen>
  );
}

const meta = {
  title: "Screens/E01/Sign in",
  tags: ["!autodocs"],
  parameters: { ...screenParameters, msw: [http.post(SIGN_IN, () => ok({ redirectTo: "/account" }))] },
  args: { error: undefined, phase: 2 },
  render: (args: { error?: GithubErrorCode; phase?: 1 | 2 }) => <SignInScreen {...args} />,
} satisfies Meta<{ error?: GithubErrorCode; phase?: 1 | 2 }>;

export default meta;
type Story = StoryObj<typeof meta>;

type Canvas = Parameters<NonNullable<Story["play"]>>[0]["canvas"];
async function signIn(canvas: Canvas, password = "correct horse battery staple") {
  await userEvent.type(canvas.getByRole("textbox", { name: "Email" }), "ada@example.com");
  await userEvent.type(canvas.getByLabelText("Password"), password);
  await userEvent.click(canvas.getByRole("button", { name: "Sign in" }));
}

/** Default (Phase 2): GitHub first, the email form, N03 and Create an account. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 1, name: "Sign in" })).toBeVisible();
    // GitHub is the first way in on the page (E01: GitHub first).
    await expect(within(canvas.getByRole("main")).getAllByRole("link")[0]).toHaveAccessibleName("Sign in with GitHub");
  },
};

/** Phase 1: GitHub only. */
export const GithubOnly: Story = { args: { phase: 1 } };

/** Back from GitHub, cancelled (?error=github_cancelled). */
export const GithubCancelled: Story = { args: { error: "github_cancelled" } };

/** Back from GitHub, the email belongs to another GitHub account. */
export const GithubEmailTaken: Story = { args: { error: "github_email_taken" } };

/** Signing in: the button waits with Signing in…. */
export const Pending: Story = {
  parameters: { msw: [http.post(SIGN_IN, async () => {
    await delay("infinite");
    return ok({});
  })] },
  play: async ({ canvas }) => {
    await signIn(canvas);
    await expect(canvas.getByRole("button", { name: "Signing in…" })).toBeDisabled();
  },
};

/** Wrong email or password (401): one generic message, values kept. */
export const WrongPassword: Story = {
  parameters: { msw: [http.post(SIGN_IN, () => fail(401, "invalid_credentials", "Email or password is incorrect"))] },
  play: async ({ canvas }) => {
    await signIn(canvas, "wrong horse battery staple");
    await expect(await canvas.findByRole("alert")).toHaveTextContent("Email or password is incorrect");
  },
};

/** Address not confirmed (403): Resend confirmation, then Check your inbox. */
export const EmailNotConfirmed: Story = {
  parameters: {
    msw: [
      http.post(SIGN_IN, () => fail(403, "email_not_confirmed", "Confirm your email first")),
      http.post(RESEND, () => ok({ emailSent: true, alreadyConfirmed: false })),
    ],
  },
  play: async ({ canvas }) => {
    await signIn(canvas);
    await userEvent.click(await canvas.findByRole("button", { name: "Resend confirmation" }));
    await expect(await canvas.findByText("Check your inbox at ada@example.com")).toBeVisible();
  },
};

/** Too many attempts (429): the spec's message, no countdown (E01 edge cases, platform P11). */
export const RateLimited: Story = {
  parameters: { msw: [http.post(SIGN_IN, () => fail(429, "rate_limited", "Too many attempts. Try again later"))] },
  play: async ({ canvas }) => {
    await signIn(canvas);
    await expect(await canvas.findByRole("alert")).toHaveTextContent("Too many attempts");
  },
};

/** 320 px with the longest banner. */
export const Narrow: Story = {
  globals: { viewport: { value: "w320", isRotated: false } },
  args: { error: "github_no_verified_email" },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth);
  },
};
