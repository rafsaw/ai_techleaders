import type { Meta, StoryObj } from "@storybook/react-vite";
import { delay, http, HttpResponse } from "msw";
import { useState } from "react";
import { expect, userEvent, waitFor } from "storybook/test";
import { z } from "zod";

import { apiCall } from "@devmentor/ui/api/apiCall";
import { CrudForm } from "@devmentor/ui/backend/forms/CrudForm";
import { Alert, AlertTitle } from "@devmentor/ui/components/alert";
import { Notice } from "@devmentor/ui/frontend/feedback/Notice";
import { SchemaForm } from "@devmentor/ui/frontend/forms/SchemaForm";

// Story-only stand-ins for E01's signUpSchema and accountUpdateSchema (not in core yet). Rules from
// 2026-10-17-accounts-and-roles.md: display name 1–100 after trim, email, password ≥ 15 (AD6).
const signUpSchema = z.object({
  displayName: z.string().trim().min(1, "Display name is required").max(100, "Use 1–100 characters."),
  email: z.email("Enter a valid email address"),
  password: z.string().min(15, "Use at least 15 characters"),
});
const signUpFields = [
  { name: "displayName", label: "Display name", autoComplete: "name", hint: "This is the name others see. You can change it." },
  { name: "email", label: "Email", type: "email", autoComplete: "email" },
  { name: "password", label: "Password", type: "password", autoComplete: "new-password" },
] as const;
const accountSchema = z.object({
  displayName: z.string().trim().min(1, "Display name is required").max(100, "Use 1–100 characters."),
});

const SIGN_UP = "/api/auth/sign-up";
const ACCOUNT = "/api/account";

// Requests that reached the simulated server in the current story (double-submit check).
let requests = 0;
const counted = <T,>(respond: () => T | Promise<T>) => async () => {
  requests += 1;
  return respond();
};

const validationError = (fieldErrors: Record<string, string[]>) =>
  HttpResponse.json({ ok: false, error: { code: "validation_error", message: "Invalid input", fieldErrors } }, { status: 400 });
// The exact 500 body from core's apiHandler.
const serverError = () => HttpResponse.json({ ok: false, error: { code: "internal_error", message: "Something went wrong" } }, { status: 500 });

/** /sign-up (public kit): on success the page navigates to /sign-up/check-email; here that page's notice shows instead. */
function SignUp() {
  const [sentTo, setSentTo] = useState<string>();
  if (sentTo) return <Notice variant="success" title={`Check your inbox at ${sentTo}`}>The link expires in 24 hours.</Notice>;
  return (
    <SchemaForm
      schema={signUpSchema}
      fields={signUpFields}
      submitLabel="Create account"
      pendingLabel="Creating account…"
      onSubmit={(body) => apiCall<{ email: string; emailSent: boolean }>(SIGN_UP, { method: "POST", body })}
      onSuccess={({ email }) => setSentTo(email)}
    />
  );
}

/** /account display name (signed-in kit, CrudForm): the page stays and says the name is saved. */
function AccountName() {
  const [saved, setSaved] = useState(false);
  return (
    <div className="flex w-full max-w-text flex-col gap-between-groups">
      {saved ? (
        <Alert role="status" variant="success">
          <AlertTitle>Your display name is saved.</AlertTitle>
        </Alert>
      ) : null}
      <CrudForm
        schema={accountSchema}
        fields={[{ name: "displayName", label: "Display name", autoComplete: "name" }]}
        initialValues={{ displayName: "Ada Nowak" }}
        onSubmit={(body) => apiCall(ACCOUNT, { method: "PATCH", body })}
        onSuccess={() => setSaved(true)}
      />
    </div>
  );
}

const meta = {
  title: "Patterns/Form",
  tags: ["!autodocs"],
  parameters: { layout: "padded" },
  beforeEach: () => {
    requests = 0;
  },
  render: () => <SignUp />,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

type Canvas = Parameters<NonNullable<Story["play"]>>[0]["canvas"];
async function fillSignUp(canvas: Canvas) {
  await userEvent.type(canvas.getByRole("textbox", { name: "Display name" }), "Ada Nowak");
  await userEvent.type(canvas.getByRole("textbox", { name: "Email" }), "ada@example.com");
  await userEvent.type(canvas.getByLabelText("Password"), "correct horse battery staple");
}

/** Success: the next step appears only after the server answers 201. */
export const Success: Story = {
  parameters: {
    msw: [http.post(SIGN_UP, counted(async () => {
      await delay(300);
      return HttpResponse.json({ ok: true, data: { email: "ada@example.com", emailSent: true } }, { status: 201 });
    }))],
  },
  play: async ({ canvas }) => {
    await fillSignUp(canvas);
    await userEvent.click(canvas.getByRole("button", { name: "Create account" }));
    await expect(canvas.queryByText("Check your inbox at ada@example.com")).toBeNull();
    await expect(await canvas.findByText("Check your inbox at ada@example.com", {}, { timeout: 3000 })).toBeVisible();
  },
};

/** Pending: the button says Creating account… and is disabled; a second click sends nothing. */
export const Pending: Story = {
  parameters: { msw: [http.post(SIGN_UP, counted(async () => {
    await delay("infinite");
    return HttpResponse.json({});
  }))] },
  play: async ({ canvas }) => {
    await fillSignUp(canvas);
    const submit = canvas.getByRole("button", { name: "Create account" });
    await userEvent.click(submit);
    await userEvent.click(submit);
    await userEvent.keyboard("{Enter}");
    await expect(canvas.getByRole("button", { name: "Creating account…" })).toBeDisabled();
    await waitFor(() => expect(requests).toBe(1));
  },
};

/** Field error from the server (400): the message sits on its field, focus moves there, values stay. */
export const ServerFieldError: Story = {
  parameters: { msw: [http.post(SIGN_UP, counted(() => validationError({ email: ["Enter a valid email address"] })))] },
  play: async ({ canvas }) => {
    await fillSignUp(canvas);
    await userEvent.click(canvas.getByRole("button", { name: "Create account" }));
    const email = canvas.getByRole("textbox", { name: "Email" });
    await waitFor(() => expect(email).toHaveFocus());
    await expect(email).toHaveAttribute("aria-invalid", "true");
    await expect(email).toHaveAccessibleDescription("Enter a valid email address");
    await expect(canvas.getByRole("textbox", { name: "Display name" })).toHaveValue("Ada Nowak");
    await expect(canvas.getByLabelText("Password")).toHaveValue("correct horse battery staple");
  },
};

/** Server error (500): one error notice above the button, the values stay, the form can be sent again. */
export const ServerError: Story = {
  parameters: { msw: [http.post(SIGN_UP, counted(serverError))] },
  play: async ({ canvas }) => {
    await fillSignUp(canvas);
    await userEvent.click(canvas.getByRole("button", { name: "Create account" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent("Something went wrong");
    await expect(canvas.getByRole("textbox", { name: "Email" })).toHaveValue("ada@example.com");
    await expect(canvas.getByRole("button", { name: "Create account" })).toBeEnabled();
  },
};

/** No network: apiCall turns the failed fetch into the same error envelope. */
export const NetworkError: Story = {
  parameters: { msw: [http.post(SIGN_UP, counted(() => HttpResponse.error()))] },
  play: async ({ canvas }) => {
    await fillSignUp(canvas);
    await userEvent.click(canvas.getByRole("button", { name: "Create account" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent("Could not reach the server. Check your connection and try again.");
    await expect(canvas.getByLabelText("Password")).toHaveValue("correct horse battery staple");
  },
};

/** Validation on leaving a field: only once it has a value; fixed errors clear on the next blur. */
export const ValidateOnBlur: Story = {
  play: async ({ canvas }) => {
    const email = canvas.getByRole("textbox", { name: "Email" });
    await userEvent.click(email);
    await userEvent.tab();
    await expect(email).not.toHaveAttribute("aria-invalid");
    await userEvent.type(email, "ada@");
    await userEvent.tab();
    await expect(email).toHaveAccessibleDescription("Enter a valid email address");
    await userEvent.type(email, "example.com");
    await userEvent.tab();
    await expect(email).not.toHaveAttribute("aria-invalid");
  },
};

/** Validation on submit: every error shows at once and focus goes to the first invalid field. */
export const FocusFirstError: Story = {
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByRole("textbox", { name: "Email" }), "ada@example.com");
    await userEvent.click(canvas.getByRole("button", { name: "Create account" }));
    await expect(canvas.getByRole("textbox", { name: "Display name" })).toHaveFocus();
    await expect(canvas.getByText("Display name is required")).toBeVisible();
    await expect(canvas.getByText("Use at least 15 characters")).toBeVisible();
    await expect(requests).toBe(0);
  },
};

/** Long content at 320 px: long values and messages wrap, the page does not scroll sideways. */
export const LongContentNarrow: Story = {
  globals: { viewport: { value: "w320", isRotated: false } },
  parameters: { msw: [http.post(SIGN_UP, counted(() => validationError({
    email: ["This address belongs to a domain we cannot deliver to. Use another address or sign in with GitHub."],
  })))] },
  play: async ({ canvas, canvasElement }) => {
    await userEvent.type(canvas.getByRole("textbox", { name: "Display name" }), "Aleksandra Wiśniewska-Konstantynowicz");
    await userEvent.type(canvas.getByRole("textbox", { name: "Email" }), "aleksandra.wisniewska-konstantynowicz@engineering.example.com");
    await userEvent.type(canvas.getByLabelText("Password"), "correct horse battery staple");
    await userEvent.click(canvas.getByRole("button", { name: "Create account" }));
    await canvas.findByText(/cannot deliver to/);
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth);
  },
};

/**
 * Signed-in kit, success: a status says it is saved. CrudForm has no `resetOnSuccess` yet (E01
 * Phase 1 adds it for /account), so today the field returns to its initial value.
 */
export const SignedInSuccess: Story = {
  render: () => <AccountName />,
  parameters: { msw: [http.patch(ACCOUNT, counted(async () => {
    await delay(300);
    return HttpResponse.json({ ok: true, data: { displayName: "Ada Nowak-Kowalska" } });
  }))] },
  play: async ({ canvas }) => {
    const name = canvas.getByRole("textbox", { name: "Display name" });
    await userEvent.clear(name);
    await userEvent.type(name, "Ada Nowak-Kowalska");
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await expect(canvas.getByRole("button", { name: "Saving…" })).toBeDisabled();
    await expect(await canvas.findByRole("status", {}, { timeout: 3000 })).toHaveTextContent("Your display name is saved.");
  },
};

/** Signed-in kit, field error from the server. */
export const SignedInFieldError: Story = {
  render: () => <AccountName />,
  parameters: { msw: [http.patch(ACCOUNT, counted(() => validationError({ displayName: ["Use 1–100 characters."] })))] },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await expect(await canvas.findByText("Use 1–100 characters.")).toBeVisible();
    await expect(canvas.getByRole("textbox", { name: "Display name" })).toHaveFocus();
  },
};

/** Signed-in kit, server error and no network: CrudForm's error state above the fields. */
export const SignedInServerError: Story = {
  render: () => <AccountName />,
  parameters: { msw: [http.patch(ACCOUNT, counted(serverError))] },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await expect(await canvas.findByText("Could not save")).toBeVisible();
    await expect(canvas.getByText("Something went wrong")).toBeVisible();
    await expect(canvas.getByRole("textbox", { name: "Display name" })).toHaveValue("Ada Nowak");
  },
};

/** Signed-in kit, validation on leaving a field: the error is tied to the field (Q-CF1). */
export const SignedInValidateOnBlur: Story = {
  render: () => <AccountName />,
  play: async ({ canvas }) => {
    const name = canvas.getByRole("textbox", { name: "Display name" });
    await userEvent.clear(name);
    await userEvent.type(name, " ");
    await userEvent.tab();
    await expect(name).toHaveAttribute("aria-invalid", "true");
    await expect(name).toHaveAccessibleDescription("Display name is required");
    await expect(requests).toBe(0);
  },
};

export const SignedInNetworkError: Story = {
  render: () => <AccountName />,
  parameters: { msw: [http.patch(ACCOUNT, counted(() => HttpResponse.error()))] },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await expect(await canvas.findByText("Could not reach the server. Check your connection and try again.")).toBeVisible();
  },
};
