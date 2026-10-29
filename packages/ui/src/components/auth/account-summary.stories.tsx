import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor } from "storybook/test";
import { z } from "zod";

import type { ApiResult } from "@devmentor/ui/api/types";
import { CrudForm } from "@devmentor/ui/backend/forms/CrudForm";
import { AccountSummary } from "@devmentor/ui/components/auth/AccountSummary";

// Story-only stand-in for accountUpdateSchema (E01: displayName, trim, 1–100).
const schema = z.object({ displayName: z.string().trim().min(1, "Display name is required").max(100, "Use 1–100 characters.") });
const save = fn(async (): Promise<ApiResult<unknown>> => ({ ok: true, data: {} }));

function NameForm({ name = "Ada Nowak", onSubmit = save }: { name?: string; onSubmit?: typeof save }) {
  return (
    <CrudForm
      schema={schema}
      fields={[{ name: "displayName", label: "Display name", autoComplete: "name" }]}
      initialValues={{ displayName: name }}
      onSubmit={onSubmit}
      resetOnSuccess={false}
    />
  );
}

const meta = {
  title: "Product/E01 Accounts and access/Account summary",
  component: AccountSummary,
  tags: ["!autodocs"],
  args: {
    email: "ada@example.com",
    roles: ["mentee"],
    signInMethods: { github: true, password: false },
    welcome: false,
    children: <NameForm />,
  },
  argTypes: { children: { control: false } },
} satisfies Meta<typeof AccountSummary>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A mentee signed in with GitHub. The play test saves a new display name. */
export const Playground: Story = {
  play: async ({ canvas }) => {
    const name = canvas.getByRole("textbox", { name: "Display name" });
    await userEvent.clear(name);
    await userEvent.type(name, "Ada N.");
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(save).toHaveBeenCalledWith({ displayName: "Ada N." }));
  },
};

/** First sign-in (/account?welcome=1): the notice explains the name (E01 Flow 1). */
export const Welcome: Story = { args: { welcome: true } };

/** Many: every role and both sign-in methods. */
export const AllRolesAndMethods: Story = {
  args: { roles: ["mentee", "mentor", "operator"], signInMethods: { github: true, password: true } },
};

/** Error: saving fails (no network); the form keeps the typed name. */
export const SaveFailed: Story = {
  args: {
    children: (
      <NameForm
        onSubmit={fn(async (): Promise<ApiResult<unknown>> => ({
          ok: false,
          error: { code: "network_error", message: "Could not reach the server. Check your connection and try again." },
        }))}
      />
    ),
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent("Could not reach the server.");
  },
};

/** Long content at 320 px: a long address breaks anywhere; badges wrap. */
export const LongContentNarrow: Story = {
  globals: { viewport: { value: "w320", isRotated: false } },
  args: {
    email: "aleksandra.wisniewska-konstantynowicz@engineering.example.com",
    roles: ["mentee", "mentor", "operator"],
    signInMethods: { github: true, password: true },
    children: <NameForm name="Aleksandra Wiśniewska-Konstantynowicz" />,
  },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth);
  },
};
