import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { PriceList } from "@devmentor/ui/components/mentors/PriceList";

const meta = {
  title: "Product/E02 Mentor setup/Price list",
  component: PriceList,
  tags: ["!autodocs"],
  args: { prices: { 25: "$40", 50: "$70" } },
} satisfies Meta<typeof PriceList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Both formats, 25 then 50 minutes (R01, D06). */
export const Playground: Story = {
  play: async ({ canvas }) => {
    const items = canvas.getAllByRole("listitem").map((item) => item.textContent);
    await expect(items).toEqual(["25 min · $40", "50 min · $70"]);
  },
};

/** The bounds: $5 and $1,000 per session (MD2). */
export const Bounds: Story = { args: { prices: { 25: "$5", 50: "$1,000" } } };

/** Not constrained: the 50-minute price may be lower than the 25-minute one (E02 Flow 2). */
export const LongerIsCheaper: Story = { args: { prices: { 25: "$60", 50: "$55" } } };

/** Narrow, 320 px: two short lines, nothing to wrap. */
export const Narrow: Story = {
  globals: { viewport: { value: "w320", isRotated: false } },
  args: { prices: { 25: "$1,000", 50: "$1,000" } },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth);
  },
};
