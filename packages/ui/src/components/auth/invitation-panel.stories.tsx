import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor } from "storybook/test";

import type { ApiResult } from "@devmentor/ui/backend/api/types";
import { InvitationPanel } from "@devmentor/ui/components/auth/InvitationPanel";

const valid = {
  status: "valid" as const,
  displayName: "Ada Nowak",
  email: "ada@example.com",
  accept: fn(async (): Promise<ApiResult<unknown>> => ({ ok: true, data: {} })),
  onAccepted: fn(),
};

const meta = {
  title: "Product/E01 Accounts and access/Invitation panel",
  component: InvitationPanel,
  tags: ["!autodocs"],
  args: { state: valid },
  argTypes: { state: { control: false } },
} satisfies Meta<typeof InvitationPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Valid, matching verified account: Accept invitation grants the mentor role (E01 Flow 3). */
export const Playground: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Accept invitation" }));
    await waitFor(() => expect(valid.onAccepted).toHaveBeenCalled());
  },
};

/** Valid, signed out: sign in or create an account with the invited address; returnTo is kept. */
export const SignedOut: Story = {
  args: { state: { status: "signed-out", signInHref: "/sign-in?returnTo=%2Finvite%2F…", signUpHref: "/sign-up?returnTo=%2Finvite%2F…" } },
};

/** Valid, signed in with another or unverified address: no Accept, no invited address shown. */
export const Mismatch: Story = {
  args: {
    state: {
      status: "mismatch",
      currentEmail: "ada@work.example",
      signOut: fn(async (): Promise<ApiResult<unknown>> => ({ ok: true, data: { redirectTo: "/" } })),
      onSignedOut: fn(),
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("alert")).toHaveTextContent("You are signed in as ada@work.example.");
    await expect(canvas.queryByRole("button", { name: "Accept invitation" })).toBeNull();
    await expect(canvas.getByRole("button", { name: "Sign out" })).toBeVisible();
  },
};

/** Already a mentor: nothing to accept; the invitation stays unconsumed. */
export const AlreadyMentor: Story = { args: { state: { status: "already-mentor" } } };

/** Invalid, used, revoked, superseded or expired: one message. */
export const Invalid: Story = { args: { state: { status: "invalid" } } };

/** Loading: Accepting invitation… while the server works. */
export const Pending: Story = {
  args: { state: { ...valid, accept: fn(() => new Promise<ApiResult<unknown>>(() => {})) } },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Accept invitation" }));
    await expect(canvas.getByRole("button", { name: "Accepting invitation…" })).toBeDisabled();
  },
};

/** Error: the invitation was revoked meanwhile (404); the server's message, no navigation. */
export const AcceptFailed: Story = {
  args: {
    state: {
      ...valid,
      accept: fn(async (): Promise<ApiResult<unknown>> => ({ ok: false, error: { code: "not_found", message: "This invitation is not valid" } })),
    },
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Accept invitation" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent("This invitation is not valid");
  },
};

/** Long content at 320 px: long name and address wrap. */
export const LongContentNarrow: Story = {
  globals: { viewport: { value: "w320", isRotated: false } },
  args: { state: { ...valid, displayName: "Aleksandra Wiśniewska-Konstantynowicz", email: "aleksandra.wisniewska-konstantynowicz@engineering.example.com" } },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth);
  },
};
