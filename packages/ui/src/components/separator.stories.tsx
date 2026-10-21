import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { Separator } from "@devmentor/ui/components/separator";

import { Sample } from "../../.storybook/blocks/stories";

const meta = {
  title: "Primitives/Signed-in/Separator",
  component: Separator,
  tags: ["!autodocs"],
  args: { orientation: "horizontal" },
  argTypes: { orientation: { control: "select", options: ["horizontal", "vertical"] } },
  render: (args) => (
    <div className="flex h-16 max-w-text flex-col gap-in-group data-[o=vertical]:flex-row" data-o={args.orientation}>
      <span>Email and password</span>
      <Separator {...args} />
      <span>GitHub</span>
    </div>
  ),
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Change the orientation in the Controls panel. The separator exposes its orientation. */
export const Playground: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("separator")).toHaveAttribute("aria-orientation", "horizontal");
  },
};

/** Horizontal between sections of one panel; vertical between items in a row. */
export const Orientations: Story = {
  render: () => (
    <div className="flex flex-col gap-between-groups">
      <Sample label="horizontal · between sections of /account">
        <div className="flex w-full max-w-text flex-col gap-between-groups">
          <div>
            <p className="text-meta text-muted-foreground">Display name</p>
            <p>Ada Nowak</p>
          </div>
          <Separator />
          <div>
            <p className="text-meta text-muted-foreground">Sign-in methods</p>
            <p>GitHub, Email and password</p>
          </div>
        </div>
      </Sample>
      <Sample label="vertical · between items in a row">
        <div className="flex h-5 items-center gap-in-group text-meta text-muted-foreground">
          <span>mentee</span>
          <Separator orientation="vertical" />
          <span>mentor</span>
        </div>
      </Sample>
    </div>
  ),
};

/**
 * A separator is not interactive: no hover, focus, pressed, disabled, loading or error.
 * Its only look is the 1 px border line (exception T7).
 */
export const States: Story = {
  render: () => (
    <ul className="max-w-text divide-y divide-border">
      <li className="py-list-row-y">Wed, 4 Nov, 18:30 · Open</li>
      <li className="py-list-row-y">Thu, 5 Nov, 09:00 · Booked</li>
    </ul>
  ),
};

/** At 320 px a horizontal separator spans the container; a vertical one keeps the row height. */
export const Narrow: Story = {
  globals: { viewport: { value: "w320", isRotated: false } },
  render: () => (
    <div className="flex flex-col gap-between-groups">
      <p>Mentees can only book times you publish.</p>
      <Separator />
      <p>Reserves 50 minutes; the mentee picks 25 or 50.</p>
    </div>
  ),
};
