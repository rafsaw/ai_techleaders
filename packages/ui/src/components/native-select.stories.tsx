import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent } from "storybook/test";

import { Field, FieldDescription, FieldError, FieldLabel } from "@devmentor/ui/components/field";
import {
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
} from "@devmentor/ui/components/native-select";

import { StateTable } from "../../.storybook/blocks/stories";

// MD3: the three areas of 1.0.
const areas = (
  <>
    <NativeSelectOption value="">Choose an area</NativeSelectOption>
    <NativeSelectOption value="typescript">TypeScript</NativeSelectOption>
    <NativeSelectOption value="react">React</NativeSelectOption>
    <NativeSelectOption value="python">Python</NativeSelectOption>
  </>
);

// MD8: US, UK, EEA, Canada or Switzerland. The EEA group is shortened here.
const countries = (
  <>
    <NativeSelectOption value="">Choose a country</NativeSelectOption>
    <NativeSelectOption value="US">United States</NativeSelectOption>
    <NativeSelectOption value="GB">United Kingdom</NativeSelectOption>
    <NativeSelectOption value="CA">Canada</NativeSelectOption>
    <NativeSelectOption value="CH">Switzerland</NativeSelectOption>
    <NativeSelectOptGroup label="European Economic Area">
      <NativeSelectOption value="DE">Germany</NativeSelectOption>
      <NativeSelectOption value="IE">Ireland</NativeSelectOption>
      <NativeSelectOption value="NL">Netherlands</NativeSelectOption>
      <NativeSelectOption value="NO">Norway</NativeSelectOption>
      <NativeSelectOption value="PL">Poland</NativeSelectOption>
    </NativeSelectOptGroup>
  </>
);

const meta = {
  title: "Primitives/Signed-in/Native select",
  component: NativeSelect,
  tags: ["!autodocs"],
  args: { id: "area", defaultValue: "", size: "default", disabled: false, "aria-invalid": false, onChange: fn() },
  argTypes: {
    size: { control: "select", options: ["default", "sm"] },
    disabled: { control: "boolean" },
    "aria-invalid": { control: "boolean" },
  },
  render: (args) => (
    <Field className="max-w-text">
      <FieldLabel htmlFor={args.id}>Area</FieldLabel>
      <NativeSelect {...args}>{areas}</NativeSelect>
    </Field>
  ),
} satisfies Meta<typeof NativeSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Change the props in the Controls panel. Choosing an option calls onChange. */
export const Playground: Story = {
  play: async ({ args, canvas }) => {
    const select = canvas.getByRole("combobox", { name: "Area" });
    await userEvent.selectOptions(select, "React");
    await expect(select).toHaveValue("react");
    await expect(args.onChange).toHaveBeenCalledTimes(1);
  },
};

/** Keyboard: focus with Tab, change with the arrow keys, like any native select. */
export const Keyboard: Story = {
  play: async ({ canvas }) => {
    const select = canvas.getByRole("combobox", { name: "Area" });
    await userEvent.tab();
    await expect(select).toHaveFocus();
    await expect(getComputedStyle(select).outlineStyle).toBe("solid");
  },
};

/** The two selects in the product: area (E02 Flow 2) and Stripe country (E02 Flow 3). */
export const ProductSelects: Story = {
  render: () => (
    <div className="flex max-w-text flex-col gap-between-groups">
      <Field>
        <FieldLabel htmlFor="p-area">Area</FieldLabel>
        <NativeSelect id="p-area" defaultValue="typescript">{areas}</NativeSelect>
      </Field>
      <Field>
        <FieldLabel htmlFor="p-country">Country</FieldLabel>
        <NativeSelect id="p-country" defaultValue="" aria-describedby="p-country-hint">{countries}</NativeSelect>
        <FieldDescription id="p-country-hint">
          Where you reside, or where your business is legally established. You can&apos;t change this
          Stripe account&apos;s country later.
        </FieldDescription>
      </Field>
    </div>
  ),
};

/** default 36 px; sm 32 px for dense rows only. */
export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-end gap-between-groups">
      <Field className="w-auto">
        <FieldLabel htmlFor="z-default">Area (default)</FieldLabel>
        <NativeSelect id="z-default" defaultValue="python">{areas}</NativeSelect>
      </Field>
      <Field className="w-auto">
        <FieldLabel htmlFor="z-sm">Area (sm)</FieldLabel>
        <NativeSelect id="z-sm" size="sm" defaultValue="python">{areas}</NativeSelect>
      </Field>
    </div>
  ),
};

/** Focus is a frozen preview. Selects have no hover style. */
export const States: Story = {
  render: () => (
    <StateTable
      rows={[
        {
          state: "Nothing chosen",
          children: (
            <Field className="max-w-text">
              <FieldLabel htmlFor="s-empty">Area</FieldLabel>
              <NativeSelect id="s-empty" defaultValue="">{areas}</NativeSelect>
            </Field>
          ),
        },
        {
          state: "Chosen",
          children: (
            <Field className="max-w-text">
              <FieldLabel htmlFor="s-chosen">Area</FieldLabel>
              <NativeSelect id="s-chosen" defaultValue="react">{areas}</NativeSelect>
            </Field>
          ),
        },
        {
          state: "Focus",
          note: "frozen preview",
          children: (
            <Field className="max-w-text">
              <FieldLabel htmlFor="s-focus">Area</FieldLabel>
              <NativeSelect id="s-focus" defaultValue="react" data-preview-state="focus-visible">{areas}</NativeSelect>
            </Field>
          ),
        },
        {
          state: "Disabled",
          note: "stored country is read-only (E02 Flow 3)",
          children: (
            <Field className="max-w-text" data-disabled="true">
              <FieldLabel htmlFor="s-disabled">Country</FieldLabel>
              <NativeSelect id="s-disabled" defaultValue="PL" disabled aria-describedby="s-disabled-reason">{countries}</NativeSelect>
              <FieldDescription id="s-disabled-reason">You can&apos;t change this Stripe account&apos;s country later.</FieldDescription>
            </Field>
          ),
        },
        {
          state: "Error",
          children: (
            <Field className="max-w-text" data-invalid="true">
              <FieldLabel htmlFor="s-error">Area</FieldLabel>
              <NativeSelect id="s-error" defaultValue="" aria-invalid aria-describedby="s-error-message">{areas}</NativeSelect>
              <FieldError id="s-error-message">Choose an area.</FieldError>
            </Field>
          ),
        },
      ]}
    />
  ),
};

/** At 320 px the select takes the full width; the description wraps. */
export const LongContentNarrow: Story = {
  globals: { viewport: { value: "w320", isRotated: false } },
  render: () => (
    <Field>
      <FieldLabel htmlFor="long">Country</FieldLabel>
      <NativeSelect id="long" defaultValue="CH" className="w-full" aria-describedby="long-hint">{countries}</NativeSelect>
      <FieldDescription id="long-hint">
        Where you reside, or where your business is legally established. You can&apos;t change this
        Stripe account&apos;s country later.
      </FieldDescription>
    </Field>
  ),
};
