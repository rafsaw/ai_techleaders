import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { ApiResult } from "../backend/api/types";
import { LinkButton, linkButtonVariants } from "./actions/LinkButton";
import { Notice } from "./feedback/Notice";
import { PASSWORD_HINT, PasswordField } from "./forms/PasswordField";
import { SchemaForm } from "./forms/SchemaForm";
import { SubmitButton } from "./forms/SubmitButton";
import { TextField } from "./forms/TextField";

describe("public kit", () => {
  it("renders a text field with a visible label, hint and errors tied to the input", () => {
    const { rerender } = render(<TextField label="Email" type="email" className="custom" />);
    const input = screen.getByRole("textbox", { name: "Email" });
    expect(input).toHaveAttribute("type", "email");
    expect(input).toHaveClass("h-control-md", "rounded-control", "text-control", "custom");
    expect(input).not.toHaveAttribute("aria-describedby");
    expect(input).not.toHaveAttribute("aria-invalid");

    rerender(<TextField id="email" label="Email" hint="We send the confirmation link here." errors={["Enter a valid email address"]} />);
    expect(screen.getByRole("textbox", { name: "Email" })).toHaveAttribute("type", "text");
    expect(screen.getByRole("textbox", { name: "Email" })).toHaveAccessibleDescription(
      "We send the confirmation link here. Enter a valid email address"
    );
    expect(screen.getByRole("textbox", { name: "Email" })).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid email address");

    rerender(<TextField id="email" label="Email" errors={["Too short", "Not allowed"]} />);
    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual(["Too short", "Not allowed"]);
  });

  it("renders a password field with the AD6 hint and a show toggle", () => {
    const { rerender } = render(<PasswordField />);
    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("type", "password");
    expect(input).toHaveAttribute("autocomplete", "current-password");
    expect(input).toHaveAccessibleDescription(PASSWORD_HINT);
    const toggle = screen.getByRole("button", { name: "Show password" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(toggle);
    expect(input).toHaveAttribute("type", "text");
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(toggle);
    expect(input).toHaveAttribute("type", "password");

    rerender(<PasswordField id="new" label="New password" autoComplete="new-password" disabled errors={["Use at least 15 characters"]} />);
    expect(screen.getByLabelText("New password")).toHaveAttribute("autocomplete", "new-password");
    expect(screen.getByLabelText("New password")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Show password" })).toBeDisabled();
    expect(screen.getByLabelText("New password")).toHaveAttribute("aria-invalid", "true");
  });

  it("disables the submit button with an -ing label while pending", () => {
    const { rerender } = render(<SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>);
    const button = screen.getByRole("button", { name: "Sign in" });
    expect(button).toHaveAttribute("type", "submit");
    expect(button).toBeEnabled();
    rerender(<SubmitButton pending pendingLabel="Signing in…">Sign in</SubmitButton>);
    expect(screen.getByRole("button", { name: "Signing in…" })).toBeDisabled();
    rerender(<SubmitButton disabled variant="outline" pendingLabel="Resending…">Resend confirmation</SubmitButton>);
    expect(screen.getByRole("button", { name: "Resend confirmation" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Resend confirmation" })).toHaveClass("border-input");
    expect(screen.getByRole("button", { name: "Resend confirmation" })).not.toHaveClass("border-transparent");
  });

  it("keeps a link a link in every variant", () => {
    render(<>
      <LinkButton href="/api/auth/github">Sign in with GitHub</LinkButton>
      <LinkButton href="/sign-up" variant="link" className="custom">Create an account</LinkButton>
    </>);
    expect(screen.getByRole("link", { name: "Sign in with GitHub" })).toHaveClass("bg-primary");
    expect(screen.getByRole("link", { name: "Create an account" })).toHaveClass("underline", "custom");
    expect(linkButtonVariants({ variant: "outline" }).split(" ")).not.toContain("border-transparent");
    expect(linkButtonVariants().split(" ")).toContain("bg-primary");
  });

  it("announces notices with the role that fits the variant", () => {
    const { rerender } = render(<Notice title="Check your inbox at ada@example.com" />);
    expect(screen.getByRole("status")).toHaveAttribute("data-variant", "info");
    rerender(<Notice variant="success" title="Your email is confirmed.">You are signed in.</Notice>);
    expect(screen.getByRole("status")).toHaveTextContent("You are signed in.");
    rerender(<Notice variant="error" title="GitHub sign-in failed." className="custom" />);
    expect(screen.getByRole("alert")).toHaveClass("custom");
    expect(screen.getByRole("alert").querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});

const signInSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});
const signInFields = [
  { name: "email", label: "Email", type: "email", autoComplete: "email" },
  { name: "password", label: "Password", type: "password", hint: null },
] as const;

describe("SchemaForm", () => {
  it("validates, focuses the first error and shows a server failure as an error notice", async () => {
    const onSubmit = vi.fn().mockResolvedValue({
      ok: false,
      error: { code: "invalid_credentials", message: "Email or password is incorrect" },
    } satisfies ApiResult<never>);
    render(
      <SchemaForm schema={signInSchema} fields={signInFields} submitLabel="Sign in" pendingLabel="Signing in…" onSubmit={onSubmit}>
        <Notice title="Password reset is not available yet." />
      </SchemaForm>
    );
    expect(screen.getByRole("status")).toHaveTextContent("Password reset is not available yet.");
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(screen.getByRole("textbox", { name: "Email" })).toHaveFocus();
    expect(screen.getByText("Enter your password")).toBeVisible();

    fireEvent.change(screen.getByRole("textbox", { name: "Email" }), { target: { value: "ada@example.com" } });
    fireEvent.blur(screen.getByRole("textbox", { name: "Email" }));
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "correct horse battery" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Email or password is incorrect"));
    expect(screen.getByLabelText("Password")).toHaveValue("correct horse battery");
    expect(screen.getByLabelText("Password")).toHaveAttribute("autocomplete", "current-password");
  });

  it("keeps values by default after success and can reset them", async () => {
    let finish!: (result: ApiResult<{ redirectTo: string }>) => void;
    const onSubmit = vi.fn().mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const onSuccess = vi.fn();
    const fields = [
      { name: "email", label: "Email", type: "email" },
      { name: "password", label: "Password", type: "password", autoComplete: "new-password" },
    ] as const;
    const { unmount } = render(
      <SchemaForm schema={signInSchema} fields={fields} submitLabel="Create account" pendingLabel="Creating account…" onSubmit={onSubmit} onSuccess={onSuccess} />
    );
    expect(screen.getByLabelText("Password")).toHaveAttribute("autocomplete", "new-password");
    fireEvent.change(screen.getByRole("textbox", { name: "Email" }), { target: { value: "ada@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "correct horse battery" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(screen.getByRole("button", { name: "Creating account…" })).toBeDisabled();
    await act(async () => finish({ ok: true, data: { redirectTo: "/sign-up/check-email" } }));
    expect(onSuccess).toHaveBeenCalledWith({ redirectTo: "/sign-up/check-email" });
    expect(screen.getByRole("textbox", { name: "Email" })).toHaveValue("ada@example.com");
    unmount();

    render(
      <SchemaForm schema={signInSchema} fields={fields} submitLabel="Create account" pendingLabel="Creating account…" resetOnSuccess
        onSubmit={vi.fn().mockResolvedValue({ ok: true, data: {} })} />
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Email" }), { target: { value: "ada@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "correct horse battery" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(screen.getByRole("textbox", { name: "Email" })).toHaveValue(""));
  });
});
