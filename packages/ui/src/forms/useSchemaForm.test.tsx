import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { ApiResult } from "../api/types";
import { failureMessage, RATE_LIMITED_MESSAGE, toFieldErrors } from "./field-errors";
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

describe("failureMessage", () => {
  it("gives every 429 the one generic copy and keeps other messages", () => {
    expect(failureMessage({ code: "rate_limited", message: "Slow down, 42 s left" })).toBe(RATE_LIMITED_MESSAGE);
    expect(RATE_LIMITED_MESSAGE).toBe("Too many attempts. Try again later");
    expect(failureMessage({ code: "network_error", message: "Could not reach the server." })).toBe("Could not reach the server.");
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

  it("clears a shown error while the user fixes the value, so leaving the field moves nothing", () => {
    render(<Harness onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(screen.getByTestId("email-errors")).toHaveTextContent("Enter a valid email address");
    fireEvent.change(email(), { target: { value: "ada@" } });
    expect(screen.getByTestId("email-errors")).toHaveTextContent("Enter a valid email address");
    fireEvent.change(email(), { target: { value: "ada@example.com" } });
    expect(screen.getByTestId("email-errors")).toHaveTextContent("");
    // The password also shows an error after submit, so it updates live too.
    fireEvent.change(password(), { target: { value: "short" } });
    expect(screen.getByTestId("password-errors")).toHaveTextContent("Use at least 15 characters");
    fireEvent.change(password(), { target: { value: "correct horse battery" } });
    expect(screen.getByTestId("password-errors")).toHaveTextContent("");
  });

  function fillValid() {
    fireEvent.change(email(), { target: { value: "ada@example.com" } });
    fireEvent.change(password(), { target: { value: "correct horse battery" } });
  }

  it("shows a 429 with the generic copy, whatever the server said", async () => {
    const onSubmit = vi.fn().mockResolvedValue({ ok: false, error: { code: "rate_limited", message: "Retry in 900 s" } });
    render(<Harness onSubmit={onSubmit} />);
    fillValid();
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(screen.getByTestId("form-error")).toHaveTextContent("Too many attempts. Try again later"));
  });

  it("ignores a second submit in the same turn, before the pending state renders", async () => {
    let finish!: (result: ApiResult<{ redirectTo: string }>) => void;
    const onSubmit = vi.fn().mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    render(<Harness onSubmit={onSubmit} />);
    fillValid();
    const form = email().closest("form")!;
    act(() => {
      fireEvent.submit(form);
      fireEvent.submit(form);
    });
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSubmit.mock.calls[0]![1].signal).toBeInstanceOf(AbortSignal);
    await act(async () => finish({ ok: false, error: { code: "invalid_credentials", message: "Email or password is incorrect" } }));
    // The guard is released once the answer arrived: the person can try again.
    onSubmit.mockResolvedValue({ ok: true, data: { redirectTo: "/" } });
    fireEvent.submit(form);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
  });

  it("aborts the running request on unmount and drops its result", async () => {
    let finish!: (result: ApiResult<{ redirectTo: string }>) => void;
    const onSubmit = vi.fn().mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const onSuccess = vi.fn();
    const { unmount } = render(<Harness onSubmit={onSubmit} onSuccess={onSuccess} />);
    fillValid();
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    const { signal } = onSubmit.mock.calls[0]![1] as { signal: AbortSignal };
    expect(signal.aborted).toBe(false);
    unmount();
    expect(signal.aborted).toBe(true);
    await act(async () => finish({ ok: true, data: { redirectTo: "/account" } }));
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("unmounts without a request and cancels with Escape only when asked", () => {
    const onCancel = vi.fn();
    const { rerender, unmount } = render(<Harness onSubmit={vi.fn()} />);
    fireEvent.keyDown(email(), { key: "Escape" });
    rerender(<Harness onSubmit={vi.fn()} onCancel={onCancel} />);
    fireEvent.keyDown(email(), { key: "Escape" });
    expect(onCancel).toHaveBeenCalledOnce();
    unmount();
  });
});
