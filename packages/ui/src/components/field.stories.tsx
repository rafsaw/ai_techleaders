import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from "@devmentor/ui/components/field";
import { Input } from "@devmentor/ui/components/input";
import { NativeSelect, NativeSelectOption } from "@devmentor/ui/components/native-select";
import { Textarea } from "@devmentor/ui/components/textarea";

import { StateTable } from "../../.storybook/blocks/stories";

const meta = {
  title: "Primitives/Signed-in/Field",
  component: Field,
  tags: ["!autodocs"],
  args: { orientation: "vertical" },
  argTypes: { orientation: { control: "select", options: ["vertical", "horizontal", "responsive"] } },
  render: (args) => (
    <Field {...args} className="max-w-text">
      <FieldLabel htmlFor="f-price">Price for 25 minutes (USD)</FieldLabel>
      <Input id="f-price" type="number" defaultValue={40} aria-describedby="f-price-hint" className="tabular-nums" />
      <FieldDescription id="f-price-hint">Whole dollars, from 5 to 1,000.</FieldDescription>
    </Field>
  ),
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Change the orientation in the Controls panel. Clicking the label focuses the input. */
export const Playground: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByText("Price for 25 minutes (USD)"));
    const input = canvas.getByRole("spinbutton", { name: "Price for 25 minutes (USD)" });
    await expect(input).toHaveFocus();
    await expect(input).toHaveAccessibleDescription("Whole dollars, from 5 to 1,000.");
  },
};

/** The whole /mentor/profile form body: two groups, every field labelled and required (E02 Flow 2, P-F1). */
export const ProfileForm: Story = {
  render: () => (
    <form className="flex max-w-text flex-col gap-component" aria-label="Mentor profile">
      <FieldSet>
        <FieldLegend>Profile</FieldLegend>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="pf-area">Area</FieldLabel>
            <NativeSelect id="pf-area" defaultValue="typescript" className="w-full" required>
              <NativeSelectOption value="">Choose an area</NativeSelectOption>
              <NativeSelectOption value="typescript">TypeScript</NativeSelectOption>
              <NativeSelectOption value="react">React</NativeSelectOption>
              <NativeSelectOption value="python">Python</NativeSelectOption>
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="pf-description">Description</FieldLabel>
            <Textarea id="pf-description" required aria-describedby="pf-description-hint" defaultValue="I review TypeScript services and React front ends." />
            <FieldDescription id="pf-description-hint">Plain text, up to 2,000 characters.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="pf-links">Links to public work</FieldLabel>
            <Textarea id="pf-links" className="font-mono" required aria-describedby="pf-links-hint" defaultValue="https://github.com/ada-nowak/typed-routes" />
            <FieldDescription id="pf-links-hint">One https:// link per line, up to 5.</FieldDescription>
          </Field>
        </FieldGroup>
      </FieldSet>
      <FieldSet>
        <FieldLegend>Prices</FieldLegend>
        <FieldDescription>Whole dollars, from 5 to 1,000. A new price applies to future bookings only.</FieldDescription>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="pf-25">Price for 25 minutes (USD)</FieldLabel>
            <Input id="pf-25" type="number" defaultValue={40} className="tabular-nums" required />
          </Field>
          <Field>
            <FieldLabel htmlFor="pf-50">Price for 50 minutes (USD)</FieldLabel>
            <Input id="pf-50" type="number" defaultValue={70} className="tabular-nums" required />
          </Field>
        </FieldGroup>
      </FieldSet>
    </form>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("group", { name: "Prices" })).toBeVisible();
    await expect(canvas.getByRole("spinbutton", { name: "Price for 50 minutes (USD)" })).toHaveValue(70);
    // P-F1: required fields carry the attribute, so screen readers announce "required".
    for (const field of [
      canvas.getByRole("combobox", { name: "Area" }),
      canvas.getByRole("textbox", { name: "Description" }),
      canvas.getByRole("textbox", { name: "Links to public work" }),
      canvas.getByRole("spinbutton", { name: "Price for 25 minutes (USD)" }),
      canvas.getByRole("spinbutton", { name: "Price for 50 minutes (USD)" }),
    ]) {
      await expect(field).toBeRequired();
    }
  },
};

/** Every part of a field. FieldTitle and FieldContent are for a label next to a control (horizontal). */
export const Anatomy: Story = {
  render: () => (
    <div className="flex max-w-text flex-col gap-between-groups">
      <Field data-invalid="true">
        <FieldLabel htmlFor="a-start">Start time (your time zone: Europe/Warsaw)</FieldLabel>
        <Input id="a-start" type="datetime-local" defaultValue="2026-10-21T15:00" aria-invalid aria-describedby="a-start-hint a-start-error" className="tabular-nums" />
        <FieldDescription id="a-start-hint">Reserves 50 minutes; the mentee picks 25 or 50.</FieldDescription>
        <FieldError id="a-start-error">Pick a time at least 2 hours from now. Mentees need 2 hours&apos; notice.</FieldError>
      </Field>
      <FieldSeparator>or</FieldSeparator>
      <Field orientation="horizontal">
        <FieldContent>
          <FieldTitle>Payouts with Stripe</FieldTitle>
          <FieldDescription>Stripe confirmed your account.</FieldDescription>
        </FieldContent>
      </Field>
    </div>
  ),
};

/** States of a whole field. Hover and focus belong to the control (see Input). */
export const States: Story = {
  render: () => (
    <StateTable
      rows={[
        {
          state: "Default",
          children: (
            <Field className="max-w-text">
              <FieldLabel htmlFor="s-default">Display name</FieldLabel>
              <Input id="s-default" defaultValue="Ada Nowak" />
            </Field>
          ),
        },
        {
          state: "With description",
          children: (
            <Field className="max-w-text">
              <FieldLabel htmlFor="s-desc">Display name</FieldLabel>
              <Input id="s-desc" defaultValue="Ada Nowak" aria-describedby="s-desc-hint" />
              <FieldDescription id="s-desc-hint">This is the name others see. You can change it.</FieldDescription>
            </Field>
          ),
        },
        {
          state: "Error",
          children: (
            <Field className="max-w-text" data-invalid="true">
              <FieldLabel htmlFor="s-error">Display name</FieldLabel>
              <Input id="s-error" defaultValue="" aria-invalid aria-describedby="s-error-message" />
              <FieldError id="s-error-message">Enter a display name.</FieldError>
            </Field>
          ),
        },
        {
          state: "Several errors",
          note: "errors prop, duplicates removed",
          children: (
            <Field className="max-w-text" data-invalid="true">
              <FieldLabel htmlFor="s-errors">Links to public work</FieldLabel>
              <Textarea id="s-errors" className="font-mono" aria-invalid aria-describedby="s-errors-message" defaultValue={"github.com/ada\nhttps://ada-nowak.dev\nhttps://ada-nowak.dev"} />
              <FieldError
                id="s-errors-message"
                errors={[
                  { message: "Line 1: use a full https:// link" },
                  { message: "Line 3: this link is already listed" },
                  { message: "Line 3: this link is already listed" },
                ]}
              />
            </Field>
          ),
        },
        {
          state: "Disabled",
          note: "data-disabled on Field greys the label",
          children: (
            <Field className="max-w-text" data-disabled="true">
              <FieldLabel htmlFor="s-disabled">Display name</FieldLabel>
              <Input id="s-disabled" defaultValue="Ada Nowak" disabled aria-describedby="s-disabled-reason" />
              <FieldDescription id="s-disabled-reason">Saving…</FieldDescription>
            </Field>
          ),
        },
      ]}
    />
  ),
};

/** FieldError is a live region: when it appears, screen readers read it once. Duplicates are dropped. */
export const ErrorList: Story = {
  render: () => (
    <Field className="max-w-text" data-invalid="true">
      <FieldLabel htmlFor="e-links">Links to public work</FieldLabel>
      <Textarea id="e-links" className="font-mono" aria-invalid aria-describedby="e-links-error" defaultValue="github.com/ada" />
      <FieldError
        id="e-links-error"
        errors={[{ message: "Line 1: use a full https:// link" }, { message: "Line 1: use a full https:// link" }, { message: "Add at least one link" }]}
      />
    </Field>
  ),
  play: async ({ canvas }) => {
    const alert = canvas.getByRole("alert");
    await expect(alert.querySelectorAll("li")).toHaveLength(2);
    await expect(canvas.getByRole("textbox", { name: "Links to public work" })).toBeInvalid();
  },
};

/** Orientations. Forms in E01/E02 use vertical only (P-L2); horizontal is for a label next to a short control. */
export const Orientations: Story = {
  render: () => (
    <FieldGroup className="max-w-text">
      <Field orientation="vertical">
        <FieldLabel htmlFor="o-v">Display name (vertical)</FieldLabel>
        <Input id="o-v" defaultValue="Ada Nowak" />
      </Field>
      <Field orientation="horizontal">
        <FieldLabel htmlFor="o-h">Area (horizontal)</FieldLabel>
        <NativeSelect id="o-h" defaultValue="python">
          <NativeSelectOption value="typescript">TypeScript</NativeSelectOption>
          <NativeSelectOption value="react">React</NativeSelectOption>
          <NativeSelectOption value="python">Python</NativeSelectOption>
        </NativeSelect>
      </Field>
      <Field orientation="responsive">
        <FieldLabel htmlFor="o-r">Price for 25 minutes (USD, responsive)</FieldLabel>
        <Input id="o-r" type="number" defaultValue={40} className="tabular-nums" />
      </Field>
    </FieldGroup>
  ),
};

/** At 320 px a field is one column; long labels, hints and errors wrap. */
export const LongContentNarrow: Story = {
  globals: { viewport: { value: "w320", isRotated: false } },
  render: () => (
    <Field data-invalid="true">
      <FieldLabel htmlFor="n-start">Start time (your time zone: America/Argentina/Buenos_Aires)</FieldLabel>
      <Input id="n-start" type="datetime-local" defaultValue="2026-10-21T15:00" aria-invalid aria-describedby="n-start-error" className="tabular-nums" />
      <FieldError id="n-start-error">
        This overlaps your slot at 2026-10-21T14:30:00Z. Each slot reserves 50 minutes.
      </FieldError>
    </Field>
  ),
};
