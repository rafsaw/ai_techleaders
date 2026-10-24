import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { MentorProfileHeader } from "@devmentor/ui/components/mentors/MentorProfileHeader";

const meta = {
  title: "Product/E02 Mentor setup/Mentor profile header",
  component: MentorProfileHeader,
  tags: ["!autodocs"],
  args: {
    displayName: "Ada Nowak",
    area: "typescript",
    description:
      "I maintain the type definitions of an open-source form library.\nAsk me about generics, strict mode migrations and type errors you can't read.",
  },
} satisfies Meta<typeof MentorProfileHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The name is the page heading, the area is a pill, the description keeps its line breaks. */
export const Playground: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 1, name: "Ada Nowak" })).toBeVisible();
    await expect(canvas.getByText("TypeScript")).toBeVisible();
  },
};

/** One area per mentor (MD3); the three names as the product writes them. */
export const Areas: Story = {
  render: (args) => (
    <div className="flex flex-col gap-section">
      <MentorProfileHeader {...args} />
      <MentorProfileHeader {...args} displayName="Piotr Zieliński" area="react" description="I fix hydration errors and slow re-renders in large React apps." />
      <MentorProfileHeader {...args} displayName="Marta Kowalczyk" area="python" description="Django, Celery and the deploy that worked yesterday." />
    </div>
  ),
};

/** Plain text only: Markdown and HTML are shown as typed, never rendered (E02 Flow 2). */
export const PlainTextOnly: Story = {
  args: { description: "Use **strict** mode.\n<b>Not bold</b>, and [not a link](https://example.com)." },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByText(/<b>Not bold<\/b>/)).toBeVisible();
    await expect(canvasElement.querySelector("b, strong, a")).toBeNull();
  },
};

/** No ratings, titles or employer next to the name (N02, A03, A08). */
export const NoRatings: Story = {
  play: async ({ canvasElement }) => {
    await expect(canvasElement.textContent).not.toMatch(/★|rating|review|years|senior/i);
  },
};

/** Long content at 320 px: a 100-character name and an unbroken word wrap instead of widening the page. */
export const LongContentNarrow: Story = {
  globals: { viewport: { value: "w320", isRotated: false } },
  args: {
    displayName: "Aleksandra Wiśniewska-Konstantynowicz Jabłońska-Szczepańska von Brzęczyszczykiewicz Grzegorzewska",
    description:
      "Most of my week goes into @typescript-eslint/no-unsafe-assignment warnings.\n\nLonger answers I put in a gist, for example ProjectReferencesWithIncrementalBuildAndCompositeTrue.",
  },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth);
  },
};
