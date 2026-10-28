import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, type within } from "storybook/test";
import { z } from "zod";

import type { ApiResult } from "@devmentor/ui/api/types";
import { Notice } from "@devmentor/ui/frontend/feedback/Notice";
import { SchemaForm } from "@devmentor/ui/frontend/forms/SchemaForm";

import { Sample } from "../../../.storybook/blocks/stories";

// Story-only stand-ins for E01 Phase 2's signInSchema / signUpSchema (not built yet). Rules from
// 2026-10-17-accounts-and-roles.md: display name 1–100 after trim, email, password ≥ 15 (AD6).
const signInSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});
const signUpSchema = z.object({
  displayName: z.string().trim().min(1, "Display name is required").max(100, "Use 1–100 characters."),
  email: z.email("Enter a valid email address"),
  password: z.string().min(15, "Use at least 15 characters"),
});

const signInFields = [
  { name: "email", label: "Email", type: "email", autoComplete: "email" },
  { name: "password", label: "Password", type: "password", hint: null },
] as const;
const signUpFields = [
  { name: "displayName", label: "Display name", autoComplete: "name", hint: "This is the name others see. You can change it." },
  { name: "email", label: "Email", type: "email", autoComplete: "email" },
  { name: "password", label: "Password", type: "password", autoComplete: "new-password" },
] as const;

const N03 = (
  <Notice title="Password reset is not available yet.">
    Save your password in a password manager, or use GitHub sign-in. If you forget an email-only
    account&apos;s password, you cannot recover access in version 1.0.
  </Notice>
);

const ok: ApiResult<{ redirectTo: string }> = { ok: true, data: { redirectTo: "/account" } };
const submitSignIn = fn(async () => ok);

const meta = {
  title: "Primitives/Public/Schema form",
  component: SchemaForm,
  tags: ["!autodocs"],
  args: {
    schema: signInSchema,
    fields: signInFields,
    submitLabel: "Sign in",
    pendingLabel: "Signing in…",
    onSubmit: submitSignIn,
    onSuccess: fn(),
    children: N03,
  },
  argTypes: {
    schema: { control: false },
    fields: { control: false },
    onSubmit: { control: false },
    children: { control: false },
  },
} satisfies Meta<typeof SchemaForm<typeof signInSchema, { redirectTo: string }>>;

export default meta;
type Story = StoryObj<typeof meta>;

async function fillSignIn(canvas: ReturnType<typeof within>) {
  await userEvent.type(canvas.getByRole("textbox", { name: "Email" }), "ada@example.com");
  await userEvent.type(canvas.getByLabelText("Password"), "correct horse battery staple");
}

/** /sign-in's email form with the N03 notice before the fields. Success passes data.redirectTo on. */
export const Playground: Story = {
  play: async ({ args, canvas }) => {
    await fillSignIn(canvas);
    await userEvent.click(canvas.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(args.onSuccess).toHaveBeenCalledWith({ redirectTo: "/account" }));
    await expect(args.onSubmit).toHaveBeenCalledWith(
      { email: "ada@example.com", password: "correct horse battery staple" },
      { signal: expect.any(AbortSignal) }
    );
  },
};

/** The three public forms of E01: sign in, sign up, confirm email. */
export const Variants: Story = {
  render: () => (
    <div className="flex flex-col gap-section">
      <Sample label="/sign-in · email form">
        <SchemaForm schema={signInSchema} fields={signInFields} submitLabel="Sign in" pendingLabel="Signing in…" onSubmit={async () => ok}>
          {N03}
        </SchemaForm>
      </Sample>
      <Sample label="/sign-up · AD6 hint and N03 before typing">
        <SchemaForm schema={signUpSchema} fields={signUpFields} submitLabel="Create account" pendingLabel="Creating account…" onSubmit={async () => ok}>
          {N03}
        </SchemaForm>
      </Sample>
      <Sample label="/confirm-email · valid link">
        <SchemaForm
          schema={z.object({ password: z.string().min(1, "Enter your password") })}
          fields={[{ name: "password", label: "Password", type: "password", hint: null }]}
          submitLabel="Confirm"
          pendingLabel="Confirming…"
          onSubmit={async () => ok}
        />
      </Sample>
    </div>
  ),
};

/** Submitting empty shows every error and moves focus to the first invalid field; nothing is sent. */
export const ClientErrors: Story = {
  args: { onSubmit: fn(async () => ok) },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Sign in" }));
    await expect(canvas.getByRole("textbox", { name: "Email" })).toHaveFocus();
    await expect(canvas.getByText("Enter a valid email address")).toBeVisible();
    await expect(canvas.getByText("Enter your password")).toBeVisible();
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

/** Leaving a filled field validates it; an empty field stays quiet until submit. */
export const ValidateOnBlur: Story = {
  play: async ({ canvas }) => {
    await userEvent.tab();
    await userEvent.tab();
    await expect(canvas.queryByText("Enter a valid email address")).toBeNull();
    const email = canvas.getByRole("textbox", { name: "Email" });
    await userEvent.type(email, "ada@");
    await userEvent.tab();
    await expect(email).toHaveAttribute("aria-invalid", "true");
    await userEvent.type(email, "example.com");
    await userEvent.tab();
    await expect(email).not.toHaveAttribute("aria-invalid");
  },
};

/** While the server answers, the button is disabled with an -ing label: no double submit. */
export const Pending: Story = {
  args: { onSubmit: fn(() => new Promise<ApiResult<{ redirectTo: string }>>(() => {})) },
  play: async ({ args, canvas }) => {
    await fillSignIn(canvas);
    await userEvent.click(canvas.getByRole("button", { name: "Sign in" }));
    const button = canvas.getByRole("button", { name: "Signing in…" });
    await expect(button).toBeDisabled();
    await userEvent.click(button);
    await expect(args.onSubmit).toHaveBeenCalledTimes(1);
  },
};

/** 401 invalid_credentials: one generic message (E01), values kept, the user can fix and retry. */
export const ServerError: Story = {
  args: {
    onSubmit: fn(async (): Promise<ApiResult<{ redirectTo: string }>> => ({
      ok: false,
      error: { code: "invalid_credentials", message: "Email or password is incorrect" },
    })),
  },
  play: async ({ canvas }) => {
    await fillSignIn(canvas);
    await userEvent.click(canvas.getByRole("button", { name: "Sign in" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent("Email or password is incorrect");
    await expect(canvas.getByRole("textbox", { name: "Email" })).toHaveValue("ada@example.com");
  },
};

const rejectCommonPassword = fn(async (): Promise<ApiResult<{ redirectTo: string }>> => ({
  ok: false,
  error: { code: "validation_error", message: "Invalid input", fieldErrors: { password: ["This password is too common. Use a short phrase."] } },
}));

/** A server field error lands on its field and takes focus (shape of the API envelope). */
export const ServerFieldError: Story = {
  render: () => (
    <SchemaForm
      schema={signUpSchema}
      fields={signUpFields}
      submitLabel="Create account"
      pendingLabel="Creating account…"
      onSubmit={rejectCommonPassword}
    />
  ),
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByRole("textbox", { name: "Display name" }), "Ada Nowak");
    await userEvent.type(canvas.getByRole("textbox", { name: "Email" }), "ada@example.com");
    await userEvent.type(canvas.getByLabelText("Password"), "passwordpassword");
    await userEvent.click(canvas.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(canvas.getByLabelText("Password")).toHaveFocus());
    await expect(canvas.getByLabelText("Password")).toHaveAccessibleDescription(expect.stringContaining("too common"));
  },
};

/** No network: apiCall's message as an error notice; the form keeps everything. */
export const NoNetwork: Story = {
  globals: { viewport: { value: "w320", isRotated: false } },
  args: {
    onSubmit: fn(async (): Promise<ApiResult<{ redirectTo: string }>> => ({
      ok: false,
      error: { code: "network_error", message: "Could not reach the server. Check your connection and try again." },
    })),
  },
  play: async ({ canvas, canvasElement }) => {
    await fillSignIn(canvas);
    await userEvent.click(canvas.getByRole("button", { name: "Sign in" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent("Could not reach the server.");
    await expect(canvas.getByLabelText("Password")).toHaveValue("correct horse battery staple");
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth);
  },
};
