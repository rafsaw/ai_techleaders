import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { MentorProfileHeader, type Area } from "@devmentor/ui/components/mentors/MentorProfileHeader";
import { NotBookableNotice } from "@devmentor/ui/components/mentors/NotBookableNotice";
import { PriceList } from "@devmentor/ui/components/mentors/PriceList";
import { PublicWorkLinks } from "@devmentor/ui/components/mentors/PublicWorkLinks";
import { TextOnlyNote } from "@devmentor/ui/components/mentors/TextOnlyNote";
import { LinkButton } from "@devmentor/ui/frontend/actions/LinkButton";

// PublicMentorProfileDto (E02 API), with prices already formatted by the page (formatMoney, P17).
interface Profile {
  displayName: string;
  area: Area;
  description: string;
  publicWorkLinks: string[];
  prices: { 25: string; 50: string };
  bookable: boolean;
}

const ada: Profile = {
  displayName: "Ada Nowak",
  area: "typescript",
  description:
    "I maintain the type definitions of an open-source form library.\nAsk me about generics, strict mode migrations and type errors you can't read.",
  publicWorkLinks: ["https://github.com/adanowak/strict-migration", "https://ada.dev/notes/typescript-generics-in-forms"],
  prices: { 25: "$40", 50: "$70" },
  bookable: true,
};

/**
 * /mentors/[id]. Status first, then who; at ≥ 1024 px the prices sit in a side column next to
 * the description (E04 puts Book there); below that they follow the description.
 */
function PublicProfile({ profile }: { profile: Profile }) {
  return (
    <main className="mx-auto flex w-full max-w-content flex-col gap-component">
      {profile.bookable ? null : <NotBookableNotice />}
      <div className="grid gap-component lg:grid-cols-3">
        <MentorProfileHeader
          className="lg:col-span-2"
          displayName={profile.displayName}
          area={profile.area}
          description={profile.description}
        />
        <aside aria-label="Sessions" className="flex flex-col gap-in-group lg:col-start-3 lg:row-span-2 lg:row-start-1">
          <PriceList prices={profile.prices} />
          <TextOnlyNote />
        </aside>
        <PublicWorkLinks className="lg:col-span-2" links={profile.publicWorkLinks} />
      </div>
    </main>
  );
}

const meta = {
  title: "Patterns/Detail view",
  tags: ["!autodocs"],
  parameters: { layout: "padded" },
  args: { profile: ada },
  render: (args: { profile: Profile }) => <PublicProfile profile={args.profile} />,
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
