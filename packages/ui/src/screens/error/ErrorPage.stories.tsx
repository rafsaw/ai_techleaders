import type { Meta, StoryObj } from "@storybook/react-vite";

import { ErrorPage } from "./ErrorPage";

const meta = {
  title: "Screens/Error/Error page",
  component: ErrorPage,
  tags: ["!autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: { story: { inline: false, iframeHeight: 640 } },
  },
} satisfies Meta<typeof ErrorPage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** /error?code=internal_error: the public, identity-free fallback. */
export const InternalError: Story = {};

/** The same content at the minimum supported viewport. */
export const Narrow: Story = {
  globals: { viewport: { value: "w320", isRotated: false } },
};
