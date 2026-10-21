import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { Badge } from "@devmentor/ui/components/badge";
import { Skeleton } from "@devmentor/ui/components/skeleton";

import { Sample, StateTable } from "../../.storybook/blocks/stories";

// Story-only composition: the upcoming-slots list on /mentor/slots while it loads. Each row
// has the shape of a real row (E02 Flow 4): start time, one metadata line, a state badge.
function SlotListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div role="status" aria-busy="true" className="w-full max-w-text">
      <span className="sr-only">Loading upcoming slots</span>
      <ul className="divide-y divide-border">
        {Array.from({ length: rows }, (_, index) => (
          <li key={index} className="grid grid-cols-text-action items-center gap-x-in-group py-list-row-y">
            <div className="flex flex-col gap-list-row-gap">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-5 w-full max-w-72" />
            </div>
            <Skeleton className="h-badge w-14 rounded-pill" />
          </li>
        ))}
      </ul>
    </div>
  );
}

const meta = {
  title: "Primitives/Signed-in/Skeleton",
  component: Skeleton,
  tags: ["!autodocs"],
  args: { className: "h-6 w-40" },
  argTypes: { className: { control: "text", description: "size and, for a badge, rounded-pill" } },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Change the size in the Controls panel. The block is hidden from screen readers; the region
 * around it announces the loading once.
 */
export const Playground: Story = {
  render: (args) => (
    <div role="status" aria-busy="true">
      <span className="sr-only">Loading upcoming slots</span>
      <Skeleton {...args} />
    </div>
  ),
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByRole("status")).toHaveTextContent("Loading upcoming slots");
    await expect(canvasElement.querySelector("[data-slot=skeleton]")).toHaveAttribute("aria-hidden", "true");
  },
};

/** One shape per kind of content it stands for; heights follow the type roles and tokens. */
export const Shapes: Story = {
  render: () => (
    <div className="flex flex-col gap-between-groups">
      <Sample label="row title · h-6 (text-row-title line)">
        <Skeleton className="h-6 w-40" />
      </Sample>
      <Sample label="metadata line · h-5 (text-meta line)">
        <Skeleton className="h-5 w-72" />
      </Sample>
      <Sample label="badge · h-badge, rounded-pill">
        <Skeleton className="h-badge w-14 rounded-pill" />
      </Sample>
      <Sample label="slot list · 3 rows">
        <SlotListSkeleton />
      </Sample>
    </div>
  ),
};

/**
 * A skeleton has one state: loading. It pulses slowly and stands still with reduced motion
 * (Q4). When the data arrives, the real rows replace it in the same place.
 */
export const States: Story = {
  render: () => (
    <StateTable
      rows={[
        { state: "Loading", note: "pulse, 0 ms with reduced motion", children: <SlotListSkeleton rows={2} /> },
        {
          state: "Loaded",
          note: "real rows in the same place",
          children: (
            <ul className="w-full max-w-text divide-y divide-border">
              {[
                ["Wed, 4 Nov, 18:30", "Open", "outline"],
                ["Thu, 5 Nov, 09:00", "Booked", "secondary"],
              ].map(([when, state, variant]) => (
                <li key={when} className="grid grid-cols-text-action items-center gap-x-in-group py-list-row-y">
                  <div className="flex flex-col gap-list-row-gap">
                    <span className="text-row-title tabular-nums">{when}</span>
                    <span className="text-meta text-muted-foreground">
                      Europe/Warsaw · Reserves 50 minutes; the mentee picks 25 or 50
                    </span>
                  </div>
                  <Badge variant={variant as "outline" | "secondary"}>{state}</Badge>
                </li>
              ))}
            </ul>
          ),
        },
      ]}
    />
  ),
};

/** At 320 px the metadata line shrinks with the row; the badge keeps its size at the end. */
export const Narrow: Story = {
  globals: { viewport: { value: "w320", isRotated: false } },
  render: () => <SlotListSkeleton rows={5} />,
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByRole("status")).toHaveAttribute("aria-busy", "true");
    await expect(canvasElement.querySelectorAll("[data-slot=skeleton]")).toHaveLength(15);
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth);
  },
};
