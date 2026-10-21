import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";

import { Input } from "@devmentor/ui/components/input";
import { Label } from "@devmentor/ui/components/label";

import { StateTable } from "../../.storybook/blocks/stories";

const meta = {
  title: "Primitives/Signed-in/Label",
  component: Label,
  tags: ["!autodocs"],
  args: { htmlFor: "label-name", children: "Display name" },
  argTypes: { children: { control: "text" } },
  render: (args) => (
    <div className="flex max-w-text flex-col gap-in-group">
      <Label {...args} />
      <Input id="label-name" defaultValue="Ada Nowak" />
    </div>
  ),
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Clicking the label focuses its control (htmlFor). */
export const Playground: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByText("Display name"));
    await expect(canvas.getByRole("textbox", { name: "Display name" })).toHaveFocus();
  },
};

/** A label is text-label (14/500). An optional field says so in the label (P-F1, proposal approved by Rafał). */
export const States: Story = {
  render: () => (
    <StateTable
      rows={[
        {
          state: "Default",
          children: (
            <div className="flex w-full max-w-text flex-col gap-in-group">
              <Label htmlFor="l-default">Price for 25 minutes (USD)</Label>
              <Input id="l-default" type="number" defaultValue={40} className="tabular-nums" />
            </div>
          ),
        },
        {
          state: "Optional field",
          note: "P-F1, proposal approved by Rafał",
          children: (
            <div className="flex w-full max-w-text flex-col gap-in-group">
              <Label htmlFor="l-optional">
                Display name <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input id="l-optional" />
            </div>
          ),
        },
        {
          state: "Disabled control",
          note: "disabled text colour, no opacity (B2)",
          children: (
            <div className="flex w-full max-w-text flex-col gap-in-group">
              <Input id="l-disabled" defaultValue="Poland" disabled className="peer order-2" />
              <Label htmlFor="l-disabled" className="order-1">Country</Label>
            </div>
          ),
        },
      ]}
    />
  ),
};

/** Long labels wrap at 320 px; they are never cut off. */
export const LongContentNarrow: Story = {
  globals: { viewport: { value: "w320", isRotated: false } },
  args: { children: "Start time (your time zone: America/Argentina/Buenos_Aires)" },
};
