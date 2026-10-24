import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { Badge } from "@devmentor/ui/components/badge";
import { Button, buttonVariants } from "@devmentor/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@devmentor/ui/components/card";

import { Sample } from "../../.storybook/blocks/stories";

const meta = {
  title: "Primitives/Signed-in/Card",
  component: Card,
  tags: ["!autodocs"],
  args: { size: "default" },
  argTypes: { size: { control: "select", options: ["default", "sm"] } },
  render: (args) => (
    <Card {...args} className="max-w-text">
      <CardHeader>
        <CardTitle role="heading" aria-level={2}>Account</CardTitle>
        <CardDescription>Your sign-in details and roles.</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-in-group">
          <div>
            <dt className="text-meta text-muted-foreground">Email</dt>
            <dd>ada.nowak@example.com</dd>
          </div>
          <div>
            <dt className="text-meta text-muted-foreground">Sign-in methods</dt>
            <dd>GitHub, Email and password</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  ),
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Change the size in the Controls panel. The title is a heading for screen reader navigation. */
export const Playground: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 2, name: "Account" })).toBeVisible();
  },
};

/** default: a page panel (24 px inside). sm: an item inside a list of panels (16 px inside, B4). */
export const Sizes: Story = {
  render: () => (
    <div className="grid gap-between-groups md:grid-cols-2">
      <Sample label="default · p-panel 24 px">
        <Card className="w-full">
          <CardHeader>
            <CardTitle role="heading" aria-level={2}>Mentor setup</CardTitle>
            <CardDescription>Not bookable yet: finish your profile and Stripe.</CardDescription>
          </CardHeader>
        </Card>
      </Sample>
      <Sample label="sm · p-panel-compact 16 px">
        <Card size="sm" className="w-full">
          <CardHeader>
            <CardTitle role="heading" aria-level={3}>Payouts with Stripe</CardTitle>
            <CardDescription>Save your profile first.</CardDescription>
          </CardHeader>
        </Card>
      </Sample>
    </div>
  ),
};

/** Every part: header with title, description and action; content; footer separated by a line (B4). */
export const Anatomy: Story = {
  render: () => (
    <Card className="max-w-text">
      <CardHeader>
        <CardTitle role="heading" aria-level={2}>Profile</CardTitle>
        <CardDescription>Saved. Mentees see it at your public link.</CardDescription>
        <CardAction>
          <Badge variant="success">Saved</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p>TypeScript · 25 min $40 · 50 min $70</p>
      </CardContent>
      <CardFooter className="justify-end">
        <a href="/mentors/0b8c6c9e" className={buttonVariants({ variant: "outline" })}>View public page</a>
        <Button>Edit profile</Button>
      </CardFooter>
    </Card>
  ),
};

/**
 * A card has no interactive states of its own: no hover, focus or pressed. Its contents
 * (buttons, links) carry them. Data states (loading, empty, error) belong to the product
 * component inside it (stage 3).
 */
export const States: Story = {
  render: () => (
    <div className="grid gap-between-groups md:grid-cols-2">
      <Sample label="With actions in the footer">
        <Card size="sm" className="w-full">
          <CardHeader>
            <CardTitle role="heading" aria-level={3}>Slots</CardTitle>
            <CardDescription className="tabular-nums">3 upcoming (1 booked)</CardDescription>
          </CardHeader>
          <CardFooter className="justify-end">
            <Button variant="outline" size="sm">Manage slots</Button>
          </CardFooter>
        </Card>
      </Sample>
      <Sample label="Locked item: the reason is text">
        <Card size="sm" className="w-full">
          <CardHeader>
            <CardTitle role="heading" aria-level={3}>Slots</CardTitle>
            <CardDescription>Locked. Save your profile first.</CardDescription>
          </CardHeader>
        </Card>
      </Sample>
    </div>
  ),
};

/** At 320 px the card takes the full width; long text wraps, footer actions wrap. */
export const LongContentNarrow: Story = {
  globals: { viewport: { value: "w320", isRotated: false } },
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle role="heading" aria-level={2}>Payouts with Stripe</CardTitle>
        <CardDescription>
          Stripe is checking your details. This can take a few minutes to a few business days.
        </CardDescription>
      </CardHeader>
      <CardFooter className="flex-wrap justify-end">
        <Button variant="secondary" className="w-full">Check status</Button>
      </CardFooter>
    </Card>
  ),
};
