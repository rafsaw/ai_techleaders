import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";

import { LinkButton } from "@devmentor/ui/frontend/actions/LinkButton";

import { Sample, StateTable } from "../../../.storybook/blocks/stories";

const meta = {
  title: "Primitives/Public/Link button",
  component: LinkButton,
  tags: ["!autodocs"],
  args: { href: "/api/auth/github", children: "Sign in with GitHub", variant: "default" },
  argTypes: { variant: { control: "select", options: ["default", "outline", "link"] } },
} satisfies Meta<typeof LinkButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Change the props in the Controls panel. It is a real link (role link), never a button. */
export const Playground: Story = {
  play: async ({ canvas }) => {
    const link = canvas.getByRole("link", { name: "Sign in with GitHub" });
    await expect(link).toHaveAttribute("href", "/api/auth/github");
    await expect(canvas.queryByRole("button")).toBeNull();
  },
};

/** /sign-in: GitHub first as the main action, then the text link to sign-up (E01 UI/UX). */
export const Variants: Story = {
  render: () => (
    <div className="flex flex-col gap-between-groups">
      <Sample label="default · the main action is a navigation">
        <LinkButton href="/api/auth/github">
          Sign in with GitHub
        </LinkButton>
      </Sample>
      <Sample label="outline · a second way, e.g. retry after an error">
        <LinkButton href="/api/auth/github" variant="outline">Sign in with GitHub</LinkButton>
      </Sample>
      <Sample label="link · inline navigation">
        <LinkButton href="/sign-up" variant="link">Create an account</LinkButton>
      </Sample>
    </div>
  ),
};

const row = (state?: string) => (
  <>
    <LinkButton href="/api/auth/github" data-preview-state={state}>Sign in with GitHub</LinkButton>
    <LinkButton href="/api/auth/github" variant="outline" data-preview-state={state}>Sign in with GitHub</LinkButton>
    <LinkButton href="/sign-up" variant="link" data-preview-state={state}>Create an account</LinkButton>
  </>
);

/** Frozen hover, focus and pressed. A link has no disabled state: remove it or explain why. */
export const States: Story = {
  render: () => (
    <StateTable
      rows={[
        { state: "Default", children: row() },
        { state: "Hover", note: "frozen preview", children: row("hover") },
        { state: "Focus", note: "frozen preview, keyboard only", children: row("focus-visible") },
        { state: "Pressed", note: "frozen preview, same as hover", children: row("active") },
      ]}
    />
  ),
};

/** At 320 px the main action takes the full width (P-C5); Tab reaches GitHub first, then sign-up. */
export const LongContentNarrow: Story = {
  globals: { viewport: { value: "w320", isRotated: false } },
  render: () => (
    <div className="flex flex-col gap-in-group">
      <LinkButton href="/api/auth/github" className="w-full">
        Sign in with GitHub
      </LinkButton>
      <LinkButton href="/sign-up" variant="link" className="self-start">Create an account</LinkButton>
    </div>
  ),
  play: async ({ canvas, canvasElement }) => {
    await userEvent.tab();
    await expect(canvas.getByRole("link", { name: "Sign in with GitHub" })).toHaveFocus();
    await userEvent.tab();
    await expect(canvas.getByRole("link", { name: "Create an account" })).toHaveFocus();
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth);
  },
};
