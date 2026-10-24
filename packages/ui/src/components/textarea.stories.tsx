import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";

import { Field, FieldDescription, FieldError, FieldLabel } from "@devmentor/ui/components/field";
import { Textarea } from "@devmentor/ui/components/textarea";

import { StateTable } from "../../.storybook/blocks/stories";

const description =
  "I review TypeScript services and React front ends. Bring a pull request, a failing test or a design question; we go through it line by line and you leave with a list of next steps.";
const links = "https://github.com/ada-nowak/typed-routes\nhttps://ada-nowak.dev/talks/react-forms";

const meta = {
  title: "Primitives/Signed-in/Textarea",
  component: Textarea,
  tags: ["!autodocs"],
  args: { id: "description", defaultValue: description, disabled: false, "aria-invalid": false },
  argTypes: {
    disabled: { control: "boolean" },
    "aria-invalid": { control: "boolean" },
    placeholder: { control: "text" },
    rows: { control: "number" },
  },
  render: (args) => (
    <Field className="max-w-text">
      <FieldLabel htmlFor={args.id}>Description</FieldLabel>
      <Textarea {...args} />
    </Field>
  ),
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Change the props in the Controls panel. Enter adds a new line; it never submits the form. */
export const Playground: Story = {
  play: async ({ canvas }) => {
    const textarea = canvas.getByRole("textbox", { name: "Description" });
    await userEvent.clear(textarea);
    await userEvent.type(textarea, "First line{Enter}Second line");
    await expect(textarea).toHaveValue("First line\nSecond line");
  },
};

/** Both textareas in the product. Links are one per line (E02 Flow 2). */
export const ProfileFields: Story = {
  render: () => (
    <div className="flex max-w-text flex-col gap-between-groups">
      <Field>
        <FieldLabel htmlFor="p-description">Description</FieldLabel>
        <Textarea id="p-description" defaultValue={description} aria-describedby="p-description-hint" />
        <FieldDescription id="p-description-hint">Plain text, up to 2,000 characters. Line breaks are kept.</FieldDescription>
      </Field>
      <Field>
        <FieldLabel htmlFor="p-links">Links to public work</FieldLabel>
        <Textarea id="p-links" defaultValue={links} className="font-mono" aria-describedby="p-links-hint" />
        <FieldDescription id="p-links-hint">One https:// link per line, up to 5.</FieldDescription>
      </Field>
    </div>
  ),
};

/** Focus is a frozen preview. Textareas have no hover style. */
export const States: Story = {
  render: () => (
    <StateTable
      rows={[
        {
          state: "Empty",
          children: (
            <Field className="max-w-text">
              <FieldLabel htmlFor="s-empty">Links to public work</FieldLabel>
              <Textarea id="s-empty" className="font-mono" />
            </Field>
          ),
        },
        {
          state: "Filled",
          children: (
            <Field className="max-w-text">
              <FieldLabel htmlFor="s-filled">Links to public work</FieldLabel>
              <Textarea id="s-filled" defaultValue={links} className="font-mono" />
            </Field>
          ),
        },
        {
          state: "Focus",
          note: "frozen preview",
          children: (
            <Field className="max-w-text">
              <FieldLabel htmlFor="s-focus">Links to public work</FieldLabel>
              <Textarea id="s-focus" defaultValue={links} data-preview-state="focus-visible" className="font-mono" />
            </Field>
          ),
        },
        {
          state: "Disabled",
          note: "own colours; reason as text",
          children: (
            <Field className="max-w-text" data-disabled="true">
              <FieldLabel htmlFor="s-disabled">Links to public work</FieldLabel>
              <Textarea id="s-disabled" defaultValue={links} disabled aria-describedby="s-disabled-reason" className="font-mono" />
              <FieldDescription id="s-disabled-reason">Saving your profile…</FieldDescription>
            </Field>
          ),
        },
        {
          state: "Error",
          note: "the message names the line",
          children: (
            <Field className="max-w-text" data-invalid="true">
              <FieldLabel htmlFor="s-error">Links to public work</FieldLabel>
              <Textarea
                id="s-error"
                defaultValue={"https://github.com/ada-nowak/typed-routes\nada-nowak.dev/talks"}
                aria-invalid
                aria-describedby="s-error-message"
                className="font-mono"
              />
              <FieldError id="s-error-message">Line 2: use a full https:// link</FieldError>
            </Field>
          ),
        },
      ]}
    />
  ),
};

/** The error is announced with the field and names the line to fix (E02 Flow 2). */
export const Invalid: Story = {
  render: () => (
    <Field className="max-w-text" data-invalid="true">
      <FieldLabel htmlFor="links">Links to public work</FieldLabel>
      <Textarea
        id="links"
        defaultValue={"https://github.com/ada-nowak/typed-routes\nada-nowak.dev/talks"}
        aria-invalid
        aria-describedby="links-error"
        className="font-mono"
      />
      <FieldError id="links-error">Line 2: use a full https:// link</FieldError>
    </Field>
  ),
  play: async ({ canvas }) => {
    const textarea = canvas.getByRole("textbox", { name: "Links to public work" });
    await expect(textarea).toBeInvalid();
    await expect(textarea).toHaveAccessibleDescription("Line 2: use a full https:// link");
  },
};

/** The field grows with its content; at 320 px long lines wrap inside it. */
export const LongContentNarrow: Story = {
  globals: { viewport: { value: "w320", isRotated: false } },
  render: () => (
    <Field>
      <FieldLabel htmlFor="long">Description</FieldLabel>
      <Textarea id="long" defaultValue={`${description}\n\n${description}`} />
    </Field>
  ),
};
