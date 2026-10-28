import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent } from "storybook/test";

import type { ApiResult } from "@devmentor/ui/api/types";
import { SiteHeader } from "@devmentor/ui/components/auth/SiteHeader";

const meta = {
  title: "Product/E01 Accounts and access/Site header",
  component: SiteHeader,
  tags: ["!autodocs"],
  parameters: { layout: "fullscreen" },
  args: {
    account: { displayName: "Ada Nowak", roles: ["mentee"] },
    signOut: fn(async (): Promise<ApiResult<{ redirectTo: string }>> => ({ ok: true, data: { redirectTo: "/" } })),
    onSignedOut: fn(),
  },
  argTypes: { signOut: { control: false }, linkComponent: { control: false } },
} satisfies Meta<typeof SiteHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Signed in as a mentee: name and Sign out. The play test signs out. */
export const Playground: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Sign out" }));
    await expect(args.onSignedOut).toHaveBeenCalledWith("/");
  },
};

/** Signed out: only Sign in (with returnTo when the page has one). */
export const SignedOut: Story = { args: { account: null, signInHref: "/sign-in?returnTo=%2Fmentors%2F1" } };

/** Many: a mentor who is also an operator sees Mentor setup and Backend once the app passes `mentorSetupHref` (E02 Phase 1). */
export const MentorAndOperator: Story = {
  args: { account: { displayName: "Ada Nowak", roles: ["mentee", "mentor", "operator"] }, mentorSetupHref: "/mentor" },
};

/** A mentor while E01 runs standalone: no `mentorSetupHref`, so no Mentor setup link (the page ships in E02 Phase 1). */
export const MentorWithoutMentorArea: Story = {
  args: { account: { displayName: "Ada Nowak", roles: ["mentee", "mentor"] } },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("link", { name: "Mentor setup" })).toBeNull();
  },
};

/** Loading: Signing out… while the request runs. */
export const SigningOut: Story = {
  args: { signOut: fn(() => new Promise<ApiResult<{ redirectTo: string }>>(() => {})) },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Sign out" }));
    await expect(canvas.getByRole("button", { name: "Signing out…" })).toBeDisabled();
  },
};

/** Error: sign-out failed; the header says so and the user stays on the page (P-A5, proposal approved by Rafał). */
export const SignOutFailed: Story = {
  args: {
    signOut: fn(async (): Promise<ApiResult<{ redirectTo: string }>> => ({
      ok: false,
      error: { code: "network_error", message: "Could not reach the server. Check your connection and try again." },
    })),
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Sign out" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent("Could not sign out. Try again.");
  },
};

/** Long content at 320 px: the links wrap to a second line; a long name is cut with an ellipsis (P-A4, proposal approved by Rafał; temporary until the account menu). */
export const LongContentNarrow: Story = {
  globals: { viewport: { value: "w320", isRotated: false } },
  args: { account: { displayName: "Aleksandra Wiśniewska-Konstantynowicz", roles: ["mentee", "mentor", "operator"] }, mentorSetupHref: "/mentor" },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByRole("link", { name: "Aleksandra Wiśniewska-Konstantynowicz" })).toBeVisible();
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth);
  },
};
