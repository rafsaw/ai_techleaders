import type { Meta, StoryObj } from "@storybook/react-vite";
import { CalendarIcon } from "lucide-react";
import { expect, userEvent } from "storybook/test";

import { EmptyState } from "@devmentor/ui/backend/feedback/EmptyState";
import { buttonVariants } from "@devmentor/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@devmentor/ui/components/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@devmentor/ui/components/empty";

import { Sample, StateTable } from "../../.storybook/blocks/stories";

const publishSlots = (
  <a href="/mentor/slots" className={buttonVariants({ variant: "default" })}>
    Publish slots
  </a>
);

const meta = {
  title: "Primitives/Signed-in/Empty state",
  component: EmptyState,
  tags: ["!autodocs"],
  args: {
    title: "No upcoming slots",
    description: "Mentees can only book times you publish.",
  },
  argTypes: { action: { control: false } },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Change the text in the Controls panel. The empty state of /mentor/slots (E02 UI/UX). */
export const Playground: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("No upcoming slots")).toBeVisible();
    await expect(canvas.getByText("Mentees can only book times you publish.")).toBeVisible();
  },
};

/**
 * Text only when the next step is already on the page (the slot form sits above the list);
 * with an action when it is somewhere else. The icon box exists in the API but no E01/E02
 * screen uses it.
 */
export const Variants: Story = {
  render: () => (
    <div className="flex max-w-text flex-col gap-between-groups">
      <Sample label="text only · /mentor/slots, the form is above">
        <EmptyState title="No upcoming slots" description="Mentees can only book times you publish." />
      </Sample>
      <Sample label="with action · the next step is on another page">
        <EmptyState
          title="No upcoming slots"
          description="Mentees can only book times you publish."
          action={publishSlots}
        />
      </Sample>
      <Sample label="with icon box · EmptyMedia, not used in E01/E02">
        <Empty>
          <EmptyMedia variant="icon">
            <CalendarIcon aria-hidden />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>No upcoming slots</EmptyTitle>
            <EmptyDescription>Mentees can only book times you publish.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </Sample>
    </div>
  ),
};

/**
 * An empty state is not interactive; its action has the states of Button. Shown here with the
 * action focused (frozen preview) and inside the panel that frames it.
 */
export const States: Story = {
  render: () => (
    <StateTable
      rows={[
        {
          state: "Empty, in a panel",
          note: "the card is the frame",
          children: (
            <Card className="w-full max-w-text">
              <CardHeader>
                <CardTitle role="heading" aria-level={2}>Upcoming slots</CardTitle>
              </CardHeader>
              <CardContent>
                <EmptyState title="No upcoming slots" description="Mentees can only book times you publish." />
              </CardContent>
            </Card>
          ),
        },
        {
          state: "Action focused",
          note: "frozen preview, keyboard only",
          children: (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No upcoming slots</EmptyTitle>
                <EmptyDescription>Mentees can only book times you publish.</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <a href="/mentor/slots" data-preview-state="focus-visible" className={buttonVariants()}>
                  Publish slots
                </a>
              </EmptyContent>
            </Empty>
          ),
        },
      ]}
    />
  ),
};

/**
 * At 320 px the text wraps and the action stays left, under the text. A keyboard user reaches
 * the action with one Tab.
 */
export const LongContentNarrow: Story = {
  globals: { viewport: { value: "w320", isRotated: false } },
  args: {
    title: "No upcoming slots",
    description:
      "Mentees can only book times you publish. Each slot reserves 50 minutes; the mentee picks 25 or 50 when booking.",
    action: publishSlots,
  },
  play: async ({ canvas, canvasElement }) => {
    await userEvent.tab();
    const action = canvas.getByRole("link", { name: "Publish slots" });
    await expect(action).toHaveFocus();
    await expect(action).toHaveAttribute("href", "/mentor/slots");
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth);
  },
};
