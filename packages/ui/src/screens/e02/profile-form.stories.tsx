import type { Meta, StoryObj } from "@storybook/react-vite";
import { delay, http } from "msw";
import { expect, fn, userEvent, waitFor } from "storybook/test";

import { apiCall } from "@devmentor/ui/api/apiCall";
import { CrudForm } from "@devmentor/ui/backend/forms/CrudForm";

import { fail, mentorProfileSchema, ok } from "../../../.storybook/blocks/fixtures";
import { ADA_MENTOR, Screen, screenParameters } from "../../../.storybook/blocks/screen";

const PROFILE = "/api/mentors/profile";
const navigate = fn();

const fields = [
  { name: "area", label: "Area", type: "select", placeholder: "Choose an area", options: [
    { value: "typescript", label: "TypeScript" },
    { value: "react", label: "React" },
    { value: "python", label: "Python" },
  ] },
  { name: "description", label: "Description", type: "textarea" },
  { name: "publicWorkLinks", label: "Links to public work", type: "textarea", placeholder: "https://github.com/you/project" },
  { name: "price25Dollars", label: "Price for 25 minutes (USD)", type: "number" },
  { name: "price50Dollars", label: "Price for 50 minutes (USD)", type: "number" },
] as const;

const ada = {
  area: "typescript",
  description: "I maintain the type definitions of an open-source form library.\nAsk me about generics, strict mode migrations and type errors you can't read.",
  publicWorkLinks: "https://github.com/adanowak/strict-migration\nhttps://ada.dev/notes/typescript-generics-in-forms",
  price25Dollars: "40",
  price50Dollars: "70",
};

/** /mentor/profile (E02 Flow 2, signed-in): CrudForm with select and textarea fields; Save goes to /mentor. */
function ProfileScreen({ editing }: { editing: boolean }) {
  return (
    <Screen account={ADA_MENTOR} mentorSetupHref="/mentor" title={editing ? "Edit profile" : "Create your profile"} width="text">
      <CrudForm
        schema={mentorProfileSchema}
        fields={fields}
        initialValues={editing ? ada : {}}
        onSubmit={(body) => apiCall(PROFILE, { method: "PUT", body })}
        onSuccess={() => navigate("/mentor")}
      />
    </Screen>
  );
}

const meta = {
  title: "Screens/E02/Profile form",
  tags: ["!autodocs"],
  parameters: { ...screenParameters, docs: { story: { inline: false, iframeHeight: 900 } }, msw: [http.put(PROFILE, () => ok({ id: "7f3c9b2e" }))] },
  args: { editing: false },
  render: (args: { editing: boolean }) => <ProfileScreen {...args} />,
} satisfies Meta<{ editing: boolean }>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Empty: a new profile, every field visible with its label. */
export const Create: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("combobox", { name: "Area" })).toHaveValue("");
    await expect(canvas.getByRole("textbox", { name: "Links to public work" }).tagName).toBe("TEXTAREA");
  },
};

/** Editing: prefilled with the saved profile. */
export const Edit: Story = { args: { editing: true } };

/** Validation on Save: every error at once, focus on the first field. */
export const Invalid: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await expect(canvas.getByRole("combobox", { name: "Area" })).toHaveFocus();
    await expect(canvas.getByText("Describe what you help with")).toBeVisible();
  },
};

/** A link the server rejects: the message names the line (E02 Flow 2). */
export const LinkError: Story = {
  args: { editing: true },
  parameters: { msw: [http.put(PROFILE, () => fail(400, "validation_error", "Invalid input", { publicWorkLinks: ["Line 2: use a full https:// link"] }))] },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await expect(await canvas.findByText("Line 2: use a full https:// link")).toBeVisible();
    await waitFor(() => expect(canvas.getByRole("textbox", { name: "Links to public work" })).toHaveFocus());
  },
};

/** Saving: Saving…, then /mentor after the server answers. */
export const Saving: Story = {
  args: { editing: true },
  parameters: { msw: [http.put(PROFILE, async () => {
    await delay(400);
    return ok({ id: "7f3c9b2e" });
  })] },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await expect(canvas.getByRole("button", { name: "Saving…" })).toBeDisabled();
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/mentor"), { timeout: 3000 });
  },
};

/** Server error: the form keeps everything. */
export const ServerError: Story = {
  args: { editing: true },
  parameters: { msw: [http.put(PROFILE, () => fail(500, "internal_error", "Something went wrong"))] },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await expect(await canvas.findByText("Could not save")).toBeVisible();
    await expect(canvas.getByRole("spinbutton", { name: "Price for 25 minutes (USD)" })).toHaveValue(40);
  },
};

/** 320 px. */
export const Narrow: Story = {
  globals: { viewport: { value: "w320", isRotated: false } },
  args: { editing: true },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth);
  },
};
