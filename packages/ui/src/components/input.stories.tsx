import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";

import { Field, FieldDescription, FieldError, FieldLabel } from "@devmentor/ui/components/field";
import { Input } from "@devmentor/ui/components/input";

import { StateTable } from "../../.storybook/blocks/stories";

const meta = {
  title: "Primitives/Signed-in/Input",
  component: Input,
  tags: ["!autodocs"],
  args: { id: "display-name", defaultValue: "Ada Nowak", disabled: false, "aria-invalid": false },
  argTypes: {
    type: { control: "select", options: ["text", "number", "datetime-local", "email", "url"] },
    disabled: { control: "boolean" },
    "aria-invalid": { control: "boolean" },
    placeholder: { control: "text" },
  },
  render: (args) => (
    <Field className="max-w-text">
      <FieldLabel htmlFor={args.id}>Display name</FieldLabel>
      <Input {...args} />
    </Field>
  ),
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Change the props in the Controls panel. Typing replaces the value. */
export const Playground: Story = {
  play: async ({ canvas }) => {
    const input = canvas.getByRole("textbox", { name: "Display name" });
    await userEvent.clear(input);
    await userEvent.type(input, "Ada N.");
    await expect(input).toHaveValue("Ada N.");
  },
};

/** The input types used in E01 and E02. Each one is the native control, so mobile keyboards fit the value. */
export const Types: Story = {
  render: () => (
    <div className="flex max-w-text flex-col gap-between-groups">
      <Field>
        <FieldLabel htmlFor="t-name">Display name</FieldLabel>
        <Input id="t-name" defaultValue="Ada Nowak" autoComplete="name" />
      </Field>
      <Field>
        <FieldLabel htmlFor="t-price">Price for 25 minutes (USD)</FieldLabel>
        <Input id="t-price" type="number" inputMode="numeric" min={5} max={1000} step={1} defaultValue={40} className="tabular-nums" />
        <FieldDescription>Whole dollars, from 5 to 1,000.</FieldDescription>
      </Field>
      <Field>
        <FieldLabel htmlFor="t-start">Start time (your time zone: Europe/Warsaw)</FieldLabel>
        <Input id="t-start" type="datetime-local" defaultValue="2026-11-04T18:30" className="tabular-nums" />
      </Field>
    </div>
  ),
};

/** Focus is a frozen preview (same declarations as :focus-visible). Inputs have no hover style. */
export const States: Story = {
  render: () => (
    <StateTable
      rows={[
        {
          state: "Empty",
          children: (
            <Field className="max-w-text">
              <FieldLabel htmlFor="s-empty">Price for 50 minutes (USD)</FieldLabel>
              <Input id="s-empty" type="number" className="tabular-nums" />
            </Field>
          ),
        },
        {
          state: "Placeholder",
          note: "an example, never the field's name",
          children: (
            <Field className="max-w-text">
              <FieldLabel htmlFor="s-placeholder">Price for 50 minutes (USD)</FieldLabel>
              <Input id="s-placeholder" type="number" placeholder="70" className="tabular-nums" />
            </Field>
          ),
        },
        {
          state: "Filled",
          children: (
            <Field className="max-w-text">
              <FieldLabel htmlFor="s-filled">Price for 50 minutes (USD)</FieldLabel>
              <Input id="s-filled" type="number" defaultValue={70} className="tabular-nums" />
            </Field>
          ),
        },
        {
          state: "Focus",
          note: "frozen preview",
          children: (
            <Field className="max-w-text">
              <FieldLabel htmlFor="s-focus">Price for 50 minutes (USD)</FieldLabel>
              <Input id="s-focus" type="number" defaultValue={70} data-preview-state="focus-visible" className="tabular-nums" />
            </Field>
          ),
        },
        {
          state: "Disabled",
          note: "own colours; reason as text",
          children: (
            <Field className="max-w-text" data-disabled="true">
              <FieldLabel htmlFor="s-disabled">Price for 50 minutes (USD)</FieldLabel>
              <Input id="s-disabled" type="number" defaultValue={70} disabled aria-describedby="s-disabled-reason" className="tabular-nums" />
              <FieldDescription id="s-disabled-reason">Saving your profile…</FieldDescription>
            </Field>
          ),
        },
        {
          state: "Error",
          note: "red border, message below (B3)",
          children: (
            <Field className="max-w-text" data-invalid="true">
              <FieldLabel htmlFor="s-error">Price for 50 minutes (USD)</FieldLabel>
              <Input id="s-error" type="number" defaultValue={2} aria-invalid aria-describedby="s-error-message" className="tabular-nums" />
              <FieldError id="s-error-message">Enter whole dollars from 5 to 1,000.</FieldError>
            </Field>
          ),
        },
      ]}
    />
  ),
};

/** An invalid field is announced with its message: aria-invalid plus aria-describedby. */
export const Invalid: Story = {
  render: () => (
    <Field className="max-w-text" data-invalid="true">
      <FieldLabel htmlFor="price-25">Price for 25 minutes (USD)</FieldLabel>
      <Input id="price-25" type="number" defaultValue={2} aria-invalid aria-describedby="price-25-error" className="tabular-nums" />
      <FieldError id="price-25-error">Enter whole dollars from 5 to 1,000.</FieldError>
    </Field>
  ),
  play: async ({ canvas }) => {
    const input = canvas.getByRole("spinbutton", { name: "Price for 25 minutes (USD)" });
    await expect(input).toBeInvalid();
    await expect(input).toHaveAccessibleDescription("Enter whole dollars from 5 to 1,000.");
    await userEvent.tab();
    await expect(input).toHaveFocus();
    await expect(getComputedStyle(input).outlineStyle).toBe("solid");
  },
};

/** At 320 px the input takes the full width; a long value scrolls inside the field, the label wraps. */
export const LongContentNarrow: Story = {
  globals: { viewport: { value: "w320", isRotated: false } },
  render: () => (
    <div className="flex flex-col gap-between-groups">
      <Field>
        <FieldLabel htmlFor="long">Display name</FieldLabel>
        <Input id="long" defaultValue="Aleksandra Wiśniewska-Kowalczyk-Zielińska" />
      </Field>
      <Field>
        <FieldLabel htmlFor="long-start">Start time (your time zone: America/Argentina/Buenos_Aires)</FieldLabel>
        <Input id="long-start" type="datetime-local" defaultValue="2026-11-04T18:30" className="tabular-nums" />
      </Field>
    </div>
  ),
};
