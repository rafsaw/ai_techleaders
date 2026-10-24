import type { Meta, StoryObj } from "@storybook/react-vite";
import { CopyIcon, ExternalLinkIcon } from "lucide-react";
import { expect, fn, userEvent, within } from "storybook/test";

import { Button, buttonVariants } from "@devmentor/ui/components/button";
import { Spinner } from "@devmentor/ui/components/spinner";

import { Sample, StateTable } from "../../.storybook/blocks/stories";

const meta = {
  title: "Primitives/Signed-in/Button",
  component: Button,
  tags: ["!autodocs"],
  args: { children: "Publish slot", onClick: fn() },
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "outline", "secondary", "ghost", "destructive", "link"],
    },
    size: {
      control: "select",
      options: ["lg", "default", "sm", "xs", "icon-lg", "icon", "icon-sm", "icon-xs"],
    },
    disabled: { control: "boolean" },
    children: { control: "text" },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Change the props in the Controls panel. Clicking the button calls onClick once. */
export const Playground: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Publish slot" }));
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

/** One variant per kind of action. Only one `default` (primary) button per screen (R01.6, Z1). */
export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap items-end gap-between-groups">
      <Sample label="default (primary)"><Button>Continue to Stripe</Button></Sample>
      <Sample label="outline"><Button variant="outline">Manage slots</Button></Sample>
      <Sample label="secondary"><Button variant="secondary">Check status</Button></Sample>
      <Sample label="ghost"><Button variant="ghost">Cancel</Button></Sample>
      <Sample label="destructive"><Button variant="destructive">Remove slot</Button></Sample>
      <Sample label="link (text action)"><Button variant="link">Try checking again</Button></Sample>
    </div>
  ),
};

/** Heights 40 / 36 / 32 / 28 px (Q3). Icon-only buttons are square and always have an aria-label. */
export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-between-groups">
      <div className="flex flex-wrap items-end gap-between-groups">
        <Sample label="lg · 40 px"><Button size="lg">Publish slot</Button></Sample>
        <Sample label="default · 36 px"><Button>Publish slot</Button></Sample>
        <Sample label="sm · 32 px"><Button size="sm">Publish slot</Button></Sample>
        <Sample label="xs · 28 px"><Button size="xs">Publish slot</Button></Sample>
      </div>
      <div className="flex flex-wrap items-end gap-between-groups">
        <Sample label="icon-lg"><Button size="icon-lg" variant="outline" aria-label="Copy public link"><CopyIcon /></Button></Sample>
        <Sample label="icon"><Button size="icon" variant="outline" aria-label="Copy public link"><CopyIcon /></Button></Sample>
        <Sample label="icon-sm"><Button size="icon-sm" variant="outline" aria-label="Copy public link"><CopyIcon /></Button></Sample>
        <Sample label="icon-xs"><Button size="icon-xs" variant="outline" aria-label="Copy public link"><CopyIcon /></Button></Sample>
      </div>
      <div className="flex flex-wrap items-end gap-between-groups">
        <Sample label="icon with text">
          <Button variant="outline"><CopyIcon aria-hidden />Copy link</Button>
        </Sample>
      </div>
    </div>
  ),
};

const variants = ["default", "outline", "secondary", "ghost", "destructive", "link"] as const;
const row = (state?: "hover" | "active" | "focus-visible") =>
  variants.map((variant) => (
    <Button key={variant} variant={variant} data-preview-state={state}>
      {variant === "destructive" ? "Remove slot" : "Check status"}
    </Button>
  ));

/**
 * Every state of every variant. Hover, pressed and focus are frozen previews: the same
 * declarations as :hover, :active and :focus-visible, switched on by data-preview-state.
 */
export const States: Story = {
  render: () => (
    <StateTable
      rows={[
        { state: "Default", children: row() },
        { state: "Hover", note: "frozen preview", children: row("hover") },
        { state: "Focus", note: "frozen preview, keyboard only", children: row("focus-visible") },
        { state: "Pressed", note: "frozen preview, same as hover (B2)", children: row("active") },
        {
          state: "Disabled",
          note: "own colours, no opacity (B2)",
          children: variants.map((variant) => (
            <Button key={variant} variant={variant} disabled>
              {variant === "destructive" ? "Remove slot" : "Check status"}
            </Button>
          )),
        },
        {
          state: "Loading",
          note: "disabled, spinner, verb in -ing",
          children: (
            <Button disabled>
              <Spinner aria-hidden />
              Publishing slot…
            </Button>
          ),
        },
      ]}
    />
  ),
};

/**
 * A disabled action always says why. The button stays focusable (focusableWhenDisabled),
 * so keyboard and screen reader users reach it and hear the reason through aria-describedby.
 */
export const DisabledWithReason: Story = {
  render: (args) => (
    <div className="flex flex-col items-start gap-in-group">
      <Button {...args} disabled focusableWhenDisabled aria-describedby="payout-locked-reason">
        Continue to Stripe
      </Button>
      <p id="payout-locked-reason" className="text-meta text-muted-foreground">
        Save your profile first.
      </p>
    </div>
  ),
  play: async ({ args, canvas }) => {
    const button = canvas.getByRole("button", { name: "Continue to Stripe" });
    await userEvent.tab();
    await expect(button).toHaveFocus();
    await expect(button).toHaveAttribute("aria-disabled", "true");
    await expect(button).toHaveAccessibleDescription("Save your profile first.");
    await userEvent.click(button);
    await userEvent.keyboard("{Enter}");
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};

/** Enter and Space activate a focused button. */
export const Keyboard: Story = {
  args: { children: "Check status" },
  play: async ({ args, canvas }) => {
    const button = canvas.getByRole("button", { name: "Check status" });
    await userEvent.tab();
    await expect(button).toHaveFocus();
    // B3: a visible 2 px outline (Tailwind 4's outline-none would otherwise hide it).
    await expect(getComputedStyle(button).outlineStyle).toBe("solid");
    await expect(getComputedStyle(button).outlineWidth).toBe("2px");
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");
    await expect(args.onClick).toHaveBeenCalledTimes(2);
  },
};

/**
 * Navigation is a link, not a button: put buttonVariants on the anchor (or next/link) so it
 * keeps the link role. The text-action variant (`link`) is for actions inside text.
 */
export const AsLink: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-between-groups">
      <a href="/mentors/0b8c6c9e" className={buttonVariants({ variant: "outline" })}>
        View public page
      </a>
      <a
        href="https://docs.stripe.com/connect/express-accounts"
        target="_blank"
        rel="noopener noreferrer"
        className={buttonVariants({ variant: "link", size: "sm" })}
      >
        Stripe Express accounts
        <ExternalLinkIcon aria-hidden />
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("link", { name: "View public page" })).toHaveAttribute("href", "/mentors/0b8c6c9e");
    await expect(canvas.getByRole("link", { name: /Stripe Express accounts.*opens in a new tab/ })).toBeVisible();
  },
};

/** At 320 px the longest product label still fits; a page's main action can take the full width. */
export const LongLabelNarrow: Story = {
  globals: { viewport: { value: "w320", isRotated: false } },
  render: () => (
    <div className="flex flex-col gap-in-group">
      <Button className="w-full">Contact the DevMentor team</Button>
      <Button variant="outline" className="w-full">Continue with Stripe</Button>
    </div>
  ),
};
