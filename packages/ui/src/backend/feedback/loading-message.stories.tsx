import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { LoadingMessage } from "@devmentor/ui/backend/feedback/LoadingMessage";
import { Card, CardContent, CardHeader, CardTitle } from "@devmentor/ui/components/card";

import { Sample, StateTable } from "../../../.storybook/blocks/stories";

const meta = {
  title: "Primitives/Signed-in/Loading message",
  component: LoadingMessage,
  tags: ["!autodocs"],
  args: { label: "Loading users…" },
} satisfies Meta<typeof LoadingMessage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Change the label in the Controls panel. It is announced once; the spinner is hidden. */
export const Playground: Story = {
  play: async ({ canvas }) => {
    const statuses = canvas.getAllByRole("status");
    await expect(statuses).toHaveLength(1);
    await expect(statuses[0]).toHaveTextContent("Loading users…");
  },
};

/** The default label, and a label that names what loads (preferred). */
export const Variants: Story = {
  render: () => (
    <div className="flex flex-col gap-between-groups">
      <Sample label="default · what DataTable shows today">
        <LoadingMessage />
      </Sample>
      <Sample label="named · says what loads">
        <LoadingMessage label="Loading users…" />
      </Sample>
    </div>
  ),
};

/** One state: loading. In a panel it takes the place of the table until data, an error or empty. */
export const States: Story = {
  render: () => (
    <StateTable
      rows={[
        {
          state: "Loading, in a panel",
          note: "spinner stands still with reduced motion",
          children: (
            <Card className="w-full max-w-text">
              <CardHeader>
                <CardTitle role="heading" aria-level={2}>Users</CardTitle>
              </CardHeader>
              <CardContent>
                <LoadingMessage label="Loading users…" />
              </CardContent>
            </Card>
          ),
        },
      ]}
    />
  ),
};

/**
 * At 320 px a long label wraps next to the spinner; the page does not scroll sideways. The
 * label is the German translation of "Loading users…", more than 30 % longer (P-C5).
 */
export const LongContentNarrow: Story = {
  globals: { viewport: { value: "w320", isRotated: false } },
  args: { label: "Benutzerinnen und Benutzer werden geladen…" },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByRole("status")).toHaveTextContent("Benutzerinnen und Benutzer werden geladen…");
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth);
  },
};
