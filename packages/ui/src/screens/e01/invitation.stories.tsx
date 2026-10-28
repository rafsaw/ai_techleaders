import type { Meta, StoryObj } from "@storybook/react-vite";
import { delay, http } from "msw";
import { expect, fn, userEvent, waitFor } from "storybook/test";

import { apiCall } from "@devmentor/ui/api/apiCall";
import { InvitationPanel, type InvitationState } from "@devmentor/ui/components/auth/InvitationPanel";

import { fail, ok } from "../../../.storybook/blocks/fixtures";
import { ADA, ADA_MENTOR, Screen, screenParameters } from "../../../.storybook/blocks/screen";

const ACCEPT = "/api/auth/invitations/accept";
const SIGN_OUT = "/api/auth/sign-out";
const TOKEN = "k7Qm2xV9pLr4";
const returnTo = encodeURIComponent(`/invite/${TOKEN}`);
const navigate = fn();

type Status = InvitationState["status"];

function stateFor(status: Status): InvitationState {
  switch (status) {
    case "invalid":
      return { status };
    case "signed-out":
      return { status, signInHref: `/sign-in?returnTo=${returnTo}`, signUpHref: `/sign-up?returnTo=${returnTo}` };
    case "mismatch":
      return {
        status,
        currentEmail: "ada.private@example.com",
        signOut: () => apiCall(SIGN_OUT, { method: "POST" }),
        onSignedOut: navigate,
      };
    case "already-mentor":
      return { status };
    case "valid":
      return {
        status,
        displayName: "Ada Nowak",
        email: "ada@example.com",
        accept: () => apiCall(ACCEPT, { method: "POST", body: { token: TOKEN } }),
        onAccepted: () => navigate("/mentor"),
      };
  }
}

/** /invite/[token] (E01 Flow 3): five states; the GET only inspects, Accept is the only grant. */
function InvitationScreen({ status }: { status: Status }) {
  const account = status === "signed-out" || status === "invalid" ? null : status === "already-mentor" ? ADA_MENTOR : ADA;
  return (
    <Screen account={account} title="Mentor invitation" width="text">
      <InvitationPanel state={stateFor(status)} />
    </Screen>
  );
}

const meta = {
  title: "Screens/E01/Invitation",
  tags: ["!autodocs"],
  parameters: {
    ...screenParameters,
    msw: [http.post(ACCEPT, () => ok({ id: "u1", roles: ["mentee", "mentor"] })), http.post(SIGN_OUT, () => ok({ redirectTo: "/" }))],
  },
  args: { status: "valid" },
  argTypes: { status: { control: "select", options: ["valid", "signed-out", "mismatch", "already-mentor", "invalid"] } },
  render: (args: { status: Status }) => <InvitationScreen {...args} />,
} satisfies Meta<{ status: Status }>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Valid, signed in with the invited address: Accept invitation, then /mentor. */
export const Valid: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Accept invitation" }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/mentor"));
  },
};

/** Accepting: the button waits. */
export const Accepting: Story = {
  parameters: { msw: [http.post(ACCEPT, async () => {
    await delay("infinite");
    return ok({});
  })] },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Accept invitation" }));
    await expect(canvas.getByRole("button", { name: /…$/ })).toBeDisabled();
  },
};

/** Accept refused (409, already a mentor meanwhile): the server's message, no navigation. */
export const AcceptFailed: Story = {
  parameters: { msw: [http.post(ACCEPT, () => fail(409, "conflict", "You already have the mentor role."))] },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Accept invitation" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent("You already have the mentor role.");
  },
};

/** Signed out: sign in or create an account with the invited address; returnTo kept. */
export const SignedOut: Story = { args: { status: "signed-out" } };

/** Signed in with another address: no Accept, no invited address shown. */
export const OtherAccount: Story = {
  args: { status: "mismatch" },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("button", { name: "Accept invitation" })).toBeNull();
  },
};

/** Already a mentor. */
export const AlreadyMentor: Story = { args: { status: "already-mentor" } };

/** Invalid, used, revoked or expired: one message. */
export const Invalid: Story = { args: { status: "invalid" } };

/** 320 px. */
export const Narrow: Story = {
  globals: { viewport: { value: "w320", isRotated: false } },
  args: { status: "mismatch" },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth);
  },
};
