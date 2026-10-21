import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor } from "storybook/test";

import { BookableStatusLine } from "@devmentor/ui/components/mentors/BookableStatusLine";

const copy = fn(async () => {});

const meta = {
  title: "Product/E02 Mentor setup/Bookable status line",
  component: BookableStatusLine,
  tags: ["!autodocs"],
  args: { state: { status: "bookable", publicUrl: "https://devmentor.example/mentors/7f3c9b2e" }, copy },
  argTypes: { copy: { control: false } },
} satisfies Meta<typeof BookableStatusLine>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Bookable: the public link and Copy link; the result is announced politely. */
export const Playground: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Copy link" }));
    await waitFor(() => expect(canvas.getByRole("status")).toHaveTextContent("Copied."));
    await expect(copy).toHaveBeenCalledWith("https://devmentor.example/mentors/7f3c9b2e");
  },
};

/** Partial: profile and Stripe both missing; only missing items are named. */
export const NotBookable: Story = { args: { state: { status: "not-bookable", missing: ["profile", "stripe"] } } };

/** Partial: only Stripe missing. */
export const OnlyStripeMissing: Story = { args: { state: { status: "not-bookable", missing: ["stripe"] } } };

/** Empty: bookable with no open future slots (Phase 3). */
export const NoSlots: Story = { args: { state: { status: "no-slots" } } };

/** Phase 1, before the payouts item exists. */
export const PhaseOne: Story = { args: { state: { status: "phase-1" } } };

/** Error: the browser refuses the clipboard; the line says what to do instead. */
export const CopyFailed: Story = {
  args: { copy: fn(async () => { throw new Error("denied"); }) },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Copy link" }));
    await waitFor(() => expect(canvas.getByRole("status")).toHaveTextContent("Could not copy."));
  },
};

/** Long content at 320 px: the sentence and the link wrap; the link breaks anywhere. */
export const LongContentNarrow: Story = {
  globals: { viewport: { value: "w320", isRotated: false } },
  args: { state: { status: "no-slots" } },
  render: (args) => (
    <div className="flex flex-col gap-component">
      <BookableStatusLine {...args} />
      <BookableStatusLine state={{ status: "bookable", publicUrl: "https://devmentor.example/mentors/7f3c9b2e-41aa-4d0e-9a51-0c2f6a1e8d44" }} copy={copy} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth);
  },
};
