import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { PublicWorkLinks } from "@devmentor/ui/components/mentors/PublicWorkLinks";

const meta = {
  title: "Product/E02 Mentor setup/Public work links",
  component: PublicWorkLinks,
  tags: ["!autodocs"],
  args: {
    links: ["https://github.com/adanowak/strict-migration", "https://ada.dev/notes/typescript-generics-in-forms"],
  },
} satisfies Meta<typeof PublicWorkLinks>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Hostname plus path; a new tab, said to screen readers; rel="nofollow noopener ugc". */
export const Playground: Story = {
  play: async ({ canvas }) => {
    const link = canvas.getByRole("link", { name: "github.com/adanowak/strict-migration (opens in a new tab)" });
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "nofollow noopener ugc");
  },
};

/** Partial: the minimum, one link; a site root shows the hostname only. */
export const OneLink: Story = {
  args: { links: ["https://adanowak.dev/"] },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: "adanowak.dev (opens in a new tab)" })).toBeVisible();
  },
};

/** Many: the maximum, five links, in the order entered. */
export const Many: Story = {
  args: {
    links: [
      "https://github.com/adanowak/strict-migration",
      "https://github.com/react-hook-form/react-hook-form/pull/11342",
      "https://ada.dev/notes/typescript-generics-in-forms",
      "https://stackoverflow.com/users/4417120/ada-nowak",
      "https://www.npmjs.com/package/@adanowak/zod-form-errors",
    ],
  },
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole("link")).toHaveLength(5);
  },
};

/** Long content at 320 px: a long path breaks anywhere instead of widening the page. */
export const LongContentNarrow: Story = {
  globals: { viewport: { value: "w320", isRotated: false } },
  args: {
    links: [
      "https://github.com/adanowak/typescript-strict-mode-migration-for-large-monorepos-with-project-references/blob/main/docs/step-by-step-guide-including-incremental-builds.md",
    ],
  },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth);
  },
};
