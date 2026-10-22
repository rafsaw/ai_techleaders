import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { screenParameters } from "../../../.storybook/blocks/screen";
import { ErrorPage } from "./ErrorPage";

const meta = {
  title: "Screens/Error/Error page",
  tags: ["!autodocs"],
  parameters: screenParameters,
  render: () => <ErrorPage />,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** /error?code=internal_error: what happened, and the one way out. */
export const InternalError: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 1 })).toHaveTextContent("Something went wrong");
    await expect(canvas.getByRole("alert")).toHaveTextContent("We couldn't complete your request.");
    await expect(canvas.getByRole("link", { name: "Go to the home page" })).toHaveAttribute("href", "/");
    await expect(canvas.queryByRole("link", { name: "Sign in" })).toBeNull();
  },
};

/** At 320 px. */
export const Narrow: Story = {
  globals: { viewport: { value: "w320", isRotated: false } },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth);
  },
};
