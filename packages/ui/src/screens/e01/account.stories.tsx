import type { Meta, StoryObj } from "@storybook/react-vite";
import { delay, http } from "msw";
import { expect, userEvent } from "storybook/test";

import { apiCall } from "@devmentor/ui/backend/api/apiCall";
import { CrudForm } from "@devmentor/ui/backend/forms/CrudForm";
import { AccountSummary } from "@devmentor/ui/components/auth/AccountSummary";

import { accountSchema, fail, ok } from "../../../.storybook/blocks/fixtures";
import { Screen, screenParameters } from "../../../.storybook/blocks/screen";

const ACCOUNT = "/api/account";

interface Args {
  displayName: string;
  roles: readonly string[];
  signInMethods: { github: boolean; password: boolean };
  welcome: boolean;
}

/** /account (E01, signed-in): the editable display name, email, roles and sign-in methods. */
function AccountScreen({ displayName, roles, signInMethods, welcome }: Args) {
  return (
    <Screen account={{ displayName, roles }} title="Account" width="text">
      <AccountSummary email="ada@example.com" roles={roles} signInMethods={signInMethods} welcome={welcome}>
        <CrudForm
          schema={accountSchema}
          fields={[{ name: "displayName", label: "Display name", autoComplete: "name" }]}
          initialValues={{ displayName }}
          onSubmit={(body) => apiCall(ACCOUNT, { method: "PATCH", body })}
        />
      </AccountSummary>
    </Screen>
  );
}

const meta = {
  title: "Screens/E01/Account",
  tags: ["!autodocs"],
  parameters: { ...screenParameters, msw: [http.patch(ACCOUNT, () => ok({ displayName: "Ada Nowak" }))] },
  args: { displayName: "Ada Nowak", roles: ["mentee"], signInMethods: { github: true, password: false }, welcome: false },
  render: (args: Args) => <AccountScreen {...args} />,
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A mentee who signed in with GitHub. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 1, name: "Account" })).toBeVisible();
    await expect(canvas.getByRole("textbox", { name: "Display name" })).toHaveValue("Ada Nowak");
  },
};

/** First sign-in (?welcome=1): says the name is editable. */
export const Welcome: Story = { args: { welcome: true } };

/** Many: every role and both sign-in methods. */
export const AllRoles: Story = { args: { roles: ["mentee", "mentor", "operator"], signInMethods: { github: true, password: true } } };

/** Saving: Saving…. */
export const Saving: Story = {
  parameters: { msw: [http.patch(ACCOUNT, async () => {
    await delay("infinite");
    return ok({});
  })] },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await expect(canvas.getByRole("button", { name: "Saving…" })).toBeDisabled();
  },
};

/** Field error from the server. */
export const FieldError: Story = {
  parameters: { msw: [http.patch(ACCOUNT, () => fail(400, "validation_error", "Invalid input", { displayName: ["Use 1–100 characters."] }))] },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await expect(await canvas.findByText("Use 1–100 characters.")).toBeVisible();
  },
};

/** Server error. */
export const ServerError: Story = {
  parameters: { msw: [http.patch(ACCOUNT, () => fail(500, "internal_error", "Something went wrong"))] },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await expect(await canvas.findByText("Could not save")).toBeVisible();
  },
};

/** A long name at 320 px. */
export const Narrow: Story = {
  globals: { viewport: { value: "w320", isRotated: false } },
  args: { displayName: "Aleksandra Wiśniewska-Konstantynowicz", roles: ["mentee", "mentor", "operator"] },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth);
  },
};
