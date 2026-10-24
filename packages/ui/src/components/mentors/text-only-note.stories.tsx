import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { PriceList } from "@devmentor/ui/components/mentors/PriceList";
import { TextOnlyNote } from "@devmentor/ui/components/mentors/TextOnlyNote";

const meta = {
  title: "Product/E02 Mentor setup/Text-only note",
  component: TextOnlyNote,
  tags: ["!autodocs"],
} satisfies Meta<typeof TextOnlyNote>;

export default meta;
type Story = StoryObj<typeof meta>;

/** "Text sessions only" (N01), always the same words. */
export const Playground: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Text sessions only")).toBeVisible();
  },
};

/** Next to the prices, as on the public profile. */
export const WithPrices: Story = {
  render: () => (
    <div className="flex flex-col gap-in-group">
      <PriceList prices={{ 25: "$40", 50: "$70" }} />
      <TextOnlyNote />
    </div>
  ),
};
