import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { LinkButton } from "@devmentor/ui/frontend/actions/LinkButton";

import { ADA_PROFILE, PublicProfile, type Profile } from "../../.storybook/blocks/public-profile";

const ada = ADA_PROFILE;

const meta = {
  title: "Patterns/Detail view",
  tags: ["!autodocs"],
  parameters: { layout: "padded" },
  args: { profile: ada },
  render: (args: { profile: Profile }) => (
    <main className="mx-auto w-full max-w-content">
      <PublicProfile profile={args.profile} />
    </main>
  ),
} satisfies Meta<{ profile: Profile }>;

export default meta;
type Story = StoryObj<typeof meta>;

const aboveTheFold = (element: Element) => element.getBoundingClientRect().bottom <= window.innerHeight;

/** Bookable mentor: name, area and both prices visible without scrolling at 1440 px. */
export const Playground: Story = {
  globals: { viewport: { value: "w1440", isRotated: false } },
  play: async ({ canvas }) => {
    await expect(aboveTheFold(canvas.getByRole("heading", { level: 1 }))).toBe(true);
    await expect(aboveTheFold(canvas.getByRole("list", { name: "Prices" }))).toBe(true);
    await expect(canvas.queryByRole("status")).toBeNull();
  },
};

/** Not bookable yet (MD4): the notice comes first; no booking anywhere. */
export const NotBookable: Story = {
  args: { profile: { ...ada, bookable: false } },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("status")).toHaveTextContent("Not taking bookings yet");
    await expect(canvas.queryByRole("button")).toBeNull();
  },
};

/** Many: five links, the maximum. */
export const ManyLinks: Story = {
  args: {
    profile: {
      ...ada,
      publicWorkLinks: [
        "https://github.com/adanowak/strict-migration",
        "https://github.com/react-hook-form/react-hook-form/pull/11342",
        "https://ada.dev/notes/typescript-generics-in-forms",
        "https://stackoverflow.com/users/4417120/ada-nowak",
        "https://www.npmjs.com/package/@adanowak/zod-form-errors",
      ],
    },
  },
};

/** Long content at 320 px: status and name stay at the top even with a 2,000-character description. */
export const LongContentNarrow: Story = {
  globals: { viewport: { value: "w320", isRotated: false } },
  args: {
    profile: {
      ...ada,
      bookable: false,
      displayName: "Aleksandra Wiśniewska-Konstantynowicz",
      description: Array.from({ length: 14 }, (_, index) =>
        `${index + 1}. Strict mode migrations in large monorepos: project references, incremental builds and the errors they surface.`,
      ).join("\n"),
    },
  },
  play: async ({ canvas, canvasElement }) => {
    await expect(aboveTheFold(canvas.getByRole("status"))).toBe(true);
    await expect(aboveTheFold(canvas.getByRole("heading", { level: 1 }))).toBe(true);
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth);
  },
};

/**
 * Does not exist or no access: one 404 for both (an unknown id, a user who lost the mentor role),
 * so the page never says which (E02 Flow 2, platform P5 `requireRole`).
 */
export const NotFound: Story = {
  render: () => (
    <main className="mx-auto flex w-full max-w-text flex-col items-start gap-between-groups">
      <h1 className="text-page-title">Page not found</h1>
      <p className="text-body">This page doesn&apos;t exist, or you don&apos;t have access to it.</p>
      <LinkButton href="/">Go to the home page</LinkButton>
    </main>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Go to the home page" })).toHaveAttribute("href", "/");
  },
};
