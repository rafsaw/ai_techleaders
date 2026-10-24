import type { Meta, StoryObj } from "@storybook/react-vite";
import { CheckIcon, ClockIcon, OctagonXIcon, TriangleAlertIcon } from "lucide-react";
import { expect } from "storybook/test";

import { Badge } from "@devmentor/ui/components/badge";

import { Sample, StateTable } from "../../.storybook/blocks/stories";

const meta = {
  title: "Primitives/Signed-in/Badge",
  component: Badge,
  tags: ["!autodocs"],
  args: { variant: "secondary", children: "Booked" },
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "secondary", "outline", "success", "warning", "destructive", "ghost", "link"],
    },
    children: { control: "text" },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Change the props in the Controls panel. A badge is text, so its name is what it says. */
export const Playground: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Booked")).toHaveAttribute("data-slot", "badge");
  },
};

/** Each variant with the product state it shows (E01 account roles, E02 setup items and slots). */
export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap items-end gap-between-groups">
      <Sample label="outline · slot Open"><Badge variant="outline">Open</Badge></Sample>
      <Sample label="secondary · slot Booked"><Badge variant="secondary">Booked</Badge></Sample>
      <Sample label="secondary · role"><Badge variant="secondary">mentor</Badge></Sample>
      <Sample label="success · payouts Confirmed">
        <Badge variant="success"><CheckIcon aria-hidden />Confirmed</Badge>
      </Sample>
      <Sample label="warning · payouts Incomplete">
        <Badge variant="warning"><TriangleAlertIcon aria-hidden />Incomplete</Badge>
      </Sample>
      <Sample label="destructive · payouts Blocked">
        <Badge variant="destructive"><OctagonXIcon aria-hidden />Blocked</Badge>
      </Sample>
      <Sample label="default (not used in E01/E02)"><Badge>Mentor setup</Badge></Sample>
    </div>
  ),
};

/** Status badges always carry a word; the icon only repeats it (Q2, WCAG 1.4.1). */
export const StatusWithIcon: Story = {
  render: () => (
    <div className="flex flex-wrap gap-in-group">
      <Badge variant="secondary"><ClockIcon aria-hidden />Pending</Badge>
      <Badge variant="success"><CheckIcon aria-hidden />Confirmed</Badge>
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Confirmed")).toBeVisible();
    await expect(canvas.getByText("Pending")).toBeVisible();
  },
};

/**
 * Status badges are not interactive. A badge rendered as a link (render={<a />}) gets the
 * link states: hover and focus shown as frozen previews.
 */
export const States: Story = {
  render: () => (
    <StateTable
      rows={[
        {
          state: "Status (static)",
          children: (
            <>
              <Badge variant="outline">Open</Badge>
              <Badge variant="secondary">Booked</Badge>
              <Badge variant="success">Confirmed</Badge>
              <Badge variant="warning">Incomplete</Badge>
              <Badge variant="destructive">Blocked</Badge>
            </>
          ),
        },
        {
          state: "Link, default",
          note: "API only; no linked badges in E01/E02",
          children: <Badge variant="outline" render={<a href="/mentors?area=typescript" />}>TypeScript</Badge>,
        },
        {
          state: "Link, hover",
          note: "frozen preview",
          children: <Badge variant="outline" data-preview-state="hover" render={<a href="/mentors?area=react" />}>React</Badge>,
        },
        {
          state: "Link, focus",
          note: "frozen preview",
          children: <Badge variant="outline" data-preview-state="focus-visible" render={<a href="/mentors?area=python" />}>Python</Badge>,
        },
      ]}
    />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: "TypeScript" })).toHaveAttribute("href", "/mentors?area=typescript");
  },
};

/** At 320 px badges wrap to the next line as a group; the text inside a badge never wraps, so keep it short (P-C10, proposal approved by Rafał). */
export const LongContentNarrow: Story = {
  globals: { viewport: { value: "w320", isRotated: false } },
  render: () => (
    <div className="flex flex-wrap gap-in-group">
      <Badge variant="secondary">Starting Stripe setup</Badge>
      <Badge variant="secondary">mentee</Badge>
      <Badge variant="secondary">mentor</Badge>
      <Badge variant="secondary">operator</Badge>
    </div>
  ),
};
