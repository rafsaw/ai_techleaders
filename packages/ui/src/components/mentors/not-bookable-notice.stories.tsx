import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { NotBookableNotice } from "@devmentor/ui/components/mentors/NotBookableNotice";

const meta = {
  title: "Product/E02 Mentor setup/Not bookable notice",
  component: NotBookableNotice,
  tags: ["!autodocs"],
} satisfies Meta<typeof NotBookableNotice>;

export default meta;
type Story = StoryObj<typeof meta>;

/** "Not taking bookings yet" (MD4): an info notice with no action and no booking option. */
export const Playground: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("status")).toHaveTextContent("Not taking bookings yet");
    await expect(canvas.queryByRole("button")).toBeNull();
    await expect(canvas.queryByRole("link")).toBeNull();
  },
};

/** Narrow, 320 px. */
export const Narrow: Story = {
  globals: { viewport: { value: "w320", isRotated: false } },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth);
  },
};
