import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { ApiResult } from "../backend/api/types";
import { toFieldErrors } from "./field-errors";
import { useSchemaForm, type UseSchemaFormOptions } from "./useSchemaForm";

const schema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(15, "Use at least 15 characters"),
});
const fields = [{ name: "email" }, { name: "password" }] as const;

function Harness(props: Omit<UseSchemaFormOptions<typeof schema, { redirectTo: string }>, "schema" | "fields">) {
  const form = useSchemaForm({ schema, fields, ...props });
  return (
    <form noValidate onSubmit={form.handleSubmit} onKeyDown={form.handleKeyDown}>
      {fields.map(({ name }) => (
        <div key={name}>
          <label>
            {name}
            <input
              name={name}
              value={form.values[name]}
              onChange={(event) => form.setValue(name, event.target.value)}
              onBlur={() => form.handleBlur(name)}
            />
          </label>
          <span data-testid={`${name}-errors`}>{form.fieldErrors[name]?.join(", ")}</span>
        </div>
      ))}
      <span data-testid="form-error">{form.formError}</span>
      <button type="submit">{form.isSubmitting ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}

const email = () => screen.getByLabelText("email");
const password = () => screen.getByLabelText("password");

describe("toFieldErrors", () => {
  it("groups issues by field and keeps the first form-level issue", () => {
    expect(toFieldErrors([
      { path: ["email"], message: "A" },
      { path: ["email"], message: "B" },
      { path: [], message: "Form" },
      { path: [], message: "Later" },
      { path: [0], message: "Index" },
    ])).toEqual({ fieldErrors: { email: ["A", "B"], 0: ["Index"] }, formError: "Form" });
  });
});

describe("useSchemaForm", () => {
  it("validates a field on blur only once it has a value or an error, and clears it when fixed", () => {
    render(<Harness onSubmit={vi.fn()} />);
    fireEvent.blur(email());
    expect(screen.getByTestId("email-errors")).toHaveTextContent("");
    fireEvent.change(email(), { target: { value: "ada" } });
    fireEvent.blur(email());
    expect(screen.getByTestId("email-errors")).toHaveTextContent("Enter a valid email address");
    expect(screen.getByTestId("password-errors")).toHaveTextContent("");
    fireEvent.change(email(), { target: { value: "" } });
    fireEvent.blur(email());
    expect(screen.getByTestId("email-errors")).toHaveTextContent("Enter a valid email address");
    fireEvent.change(email(), { target: { value: "ada@example.com" } });
    fireEvent.blur(email());
    expect(screen.getByTestId("email-errors")).toHaveTextContent("");
    fireEvent.change(password(), { target: { value: "correct horse battery" } });
    fireEvent.blur(password());
    expect(screen.getByTestId("password-errors")).toHaveTextContent("");
  });

  it("focuses the first invalid field after a failed client validation", () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    fireEvent.change(email(), { target: { value: "ada@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(password()).toHaveFocus();
    expect(screen.getByTestId("password-errors")).toHaveTextContent("Use at least 15 characters");
  });

  it("puts server field errors on their fields, focuses them and keeps the values", async () => {
    const onSubmit = vi.fn().mockResolvedValue({
      ok: false,
      error: { code: "validation_error", message: "Invalid", fieldErrors: { email: ["Email is taken"] } },
    } satisfies ApiResult<never>);
    render(<Harness onSubmit={onSubmit} />);
    fireEvent.change(email(), { target: { value: "ada@example.com" } });
    fireEvent.change(password(), { target: { value: "correct horse battery" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(screen.getByTestId("email-errors")).toHaveTextContent("Email is taken"));
    expect(email()).toHaveFocus();
    expect(email()).toHaveValue("ada@example.com");
    expect(screen.getByTestId("form-error")).toHaveTextContent("");
  });

  it("shows a non-field failure as the form error without moving focus", async () => {
    const onSubmit = vi.fn().mockResolvedValue({
      ok: false,
      error: { code: "invalid_credentials", message: "Email or password is incorrect" },
    } satisfies ApiResult<never>);
    render(<Harness onSubmit={onSubmit} />);
    fireEvent.change(email(), { target: { value: "ada@example.com" } });
    fireEvent.change(password(), { target: { value: "correct horse battery" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(screen.getByTestId("form-error")).toHaveTextContent("Email or password is incorrect"));
    expect(password()).toHaveValue("correct horse battery");
  });

  it("submits once, passes the response data on and keeps values when asked", async () => {
    let finish!: (result: ApiResult<{ redirectTo: string }>) => void;
    const onSubmit = vi.fn().mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const onSuccess = vi.fn();
    render(<Harness onSubmit={onSubmit} onSuccess={onSuccess} resetOnSuccess={false} />);
    fireEvent.change(email(), { target: { value: "ada@example.com" } });
    fireEvent.change(password(), { target: { value: "correct horse battery" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    fireEvent.submit(email().closest("form")!);
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Signing in…" })).toBeInTheDocument();
    await act(async () => finish({ ok: true, data: { redirectTo: "/account" } }));
    expect(onSuccess).toHaveBeenCalledWith({ redirectTo: "/account" });
    expect(email()).toHaveValue("ada@example.com");
  });
});
