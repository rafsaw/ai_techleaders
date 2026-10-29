import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { WELCOME_TITLE, WelcomeNotice } from "@devmentor/ui/components/auth/WelcomeNotice";

const meta = {
  title: "Product/E01 Accounts and access/Welcome notice",
  component: WelcomeNotice,
  tags: ["!autodocs"],
  args: { displayName: "Ada Nowak" },
  argTypes: { linkComponent: { control: false } },
} satisfies Meta<typeof WelcomeNotice>;

export default meta;
type Story = StoryObj<typeof meta>;

/** After a new account's first GitHub sign-in, on the `returnTo` page (SM-AC7). */
export const Playground: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("status")).toHaveTextContent(WELCOME_TITLE);
    await expect(canvas.getByText("Ada Nowak")).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Change it in Account settings" })).toHaveAttribute("href", "/account");
  },
};

/** Long name at 320 px: the name wraps instead of overflowing. */
export const LongContentNarrow: Story = {
  globals: { viewport: { value: "w320", isRotated: false } },
  args: { displayName: "Aleksandra-Wiśniewska-Konstantynowicz-Brzęczyszczykiewicz" },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth);
  },
};
