import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { ApiResult } from "../api/types";
import { CrudForm } from "./CrudForm";

const schema = z.object({ name: z.string().min(1, "Name is required"), email: z.email("Email is invalid") });
const fields = [{ name: "name", label: "Name", placeholder: "Your name", autoComplete: "name" },
  { name: "email", label: "Email", type: "email" }] as const;
const success: ApiResult<unknown> = { ok: true, data: {} };

function fill() {
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Ada" } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ada@example.com" } });
}

function submit() {
  fireEvent.submit(screen.getByRole("button", { name: "Save" }).closest("form")!);
}

describe("CrudForm", () => {
  it("starts every field empty and displays schema messages for untouched fields", () => {
    const onSubmit = vi.fn();
    render(<CrudForm schema={schema} fields={fields} onSubmit={onSubmit} />);
    expect(screen.getByLabelText("Name")).toHaveValue("");
    expect(screen.getByLabelText("Email")).toHaveValue("");
    expect(screen.getByLabelText("Name")).toHaveAttribute("type", "text");
    expect(screen.getByLabelText("Name")).toHaveAttribute("placeholder", "Your name");
    expect(screen.getByLabelText("Name")).toHaveAttribute("autocomplete", "name");
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
    submit();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("Name is required")).toBeVisible();
    expect(screen.getByText("Email is invalid")).toBeVisible();
    expect(screen.getByLabelText("Name")).toHaveAttribute("aria-invalid", "true");
  });

  it("groups repeated field issues and shows the first form-level issue", () => {
    const invalidSchema = schema.superRefine((_value, ctx) => {
      ctx.addIssue({ code: "custom", path: ["name"], message: "Reserved name" });
      ctx.addIssue({ code: "custom", path: ["name"], message: "Pick another name" });
      ctx.addIssue({ code: "custom", message: "Form is not allowed" });
      ctx.addIssue({ code: "custom", message: "Later form issue" });
    });
    render(<CrudForm schema={invalidSchema} fields={fields} onSubmit={vi.fn()} />);
    fill();
    submit();
    expect(screen.getByText("Reserved name")).toBeVisible();
    expect(screen.getByText("Pick another name")).toBeVisible();
    expect(screen.getByText("Form is not allowed")).toBeVisible();
    expect(screen.queryByText("Later form issue")).not.toBeInTheDocument();
  });

  it("submits parsed values, prevents duplicate submissions and resets to initial values", async () => {
    let finish!: (result: ApiResult<unknown>) => void;
    const pending = new Promise<ApiResult<unknown>>((resolve) => { finish = resolve; });
    const onSubmit = vi.fn().mockReturnValue(pending);
    const onSuccess = vi.fn();
    const onCancel = vi.fn();
    render(<CrudForm schema={schema} fields={fields} initialValues={{ name: "Original" }} onSubmit={onSubmit} onSuccess={onSuccess} onCancel={onCancel} />);
    expect(screen.getByLabelText("Name")).toHaveValue("Original");
    expect(screen.getByLabelText("Email")).toHaveValue("");
    fill();
    submit();
    expect(onSubmit).toHaveBeenCalledWith({ name: "Ada", email: "ada@example.com" });
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    fireEvent.submit(screen.getByRole("button", { name: "Saving…" }).closest("form")!);
    expect(onSubmit).toHaveBeenCalledOnce();
    await act(async () => finish(success));
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
    expect(screen.getByLabelText("Name")).toHaveValue("Original");
    expect(screen.getByLabelText("Email")).toHaveValue("");
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it("passes schema transforms to submit and succeeds without an onSuccess callback", async () => {
    const numberSchema = z.object({ age: z.coerce.number().min(1) });
    const onSubmit = vi.fn().mockResolvedValue(success);
    render(<CrudForm schema={numberSchema} fields={[{ name: "age", label: "Age", type: "number" }]} submitLabel="Create" onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText("Age"), { target: { value: "42" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ age: 42 }));
    await waitFor(() => expect(screen.getByLabelText("Age")).toHaveValue(null));
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
  });

  it("places server field messages alongside inputs without duplicating the form message", async () => {
    const onSubmit = vi.fn().mockResolvedValue({ ok: false, error: {
      code: "validation_error", message: "Invalid input", fieldErrors: { email: ["Email already exists"] },
    } });
    render(<CrudForm schema={schema} fields={fields} onSubmit={onSubmit} />);
    fill(); submit();
    expect(await screen.findByText("Email already exists")).toBeVisible();
    expect(screen.queryByText("Invalid input")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveValue("ada@example.com");
    expect(screen.getByLabelText("Name")).not.toHaveAttribute("aria-invalid");
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
  });

  it.each([undefined, {}])("shows server failures without field errors: %j", async (fieldErrors) => {
    const onSubmit = vi.fn().mockResolvedValueOnce({ ok: false, error: {
      code: "unavailable", message: "Please try again", fieldErrors,
    } }).mockResolvedValueOnce(success);
    render(<CrudForm schema={schema} fields={fields} onSubmit={onSubmit} />);
    fill(); submit();
    expect(await screen.findByText("Please try again")).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent("Could not save");
    submit();
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(screen.getByLabelText("Name")).toHaveValue("");
  });

  it("supports Cmd/Ctrl+Enter and Escape cancellation and ignores ordinary keys", async () => {
    const onSubmit = vi.fn().mockResolvedValue(success);
    const onCancel = vi.fn();
    const { rerender } = render(<CrudForm schema={schema} fields={fields} onSubmit={onSubmit} onCancel={onCancel} />);
    const name = screen.getByLabelText("Name");
    fireEvent.keyDown(name, { key: "a" });
    fireEvent.keyDown(name, { key: "Enter" });
    expect(onSubmit).not.toHaveBeenCalled();
    fill();
    fireEvent.keyDown(name, { key: "Enter", ctrlKey: true });
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    await waitFor(() => expect(name).toHaveValue(""));
    fill();
    fireEvent.keyDown(name, { key: "Enter", metaKey: true });
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(name).toHaveValue(""));
    fireEvent.keyDown(name, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(2);
    rerender(<CrudForm schema={schema} fields={fields} onSubmit={onSubmit} />);
    fireEvent.keyDown(name, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it("renders textarea and select fields and submits their values (E02 Flow 2)", async () => {
    const profileSchema = z.object({
      area: z.enum(["typescript", "react", "python"], "Choose an area"),
      description: z.string().trim().min(1, "Describe what you help with"),
    });
    const onSubmit = vi.fn().mockResolvedValue(success);
    render(
      <CrudForm
        schema={profileSchema}
        fields={[
          { name: "area", label: "Area", type: "select", placeholder: "Choose an area", options: [
            { value: "typescript", label: "TypeScript" },
            { value: "react", label: "React" },
          ] },
          { name: "description", label: "Description", type: "textarea", placeholder: "What you help with" },
          { name: "other", label: "Other", type: "select" },
        ] as never}
        onSubmit={onSubmit}
      />
    );
    const area = screen.getByRole("combobox", { name: "Area" });
    expect(area).toHaveValue("");
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual(["Choose an area", "TypeScript", "React", ""]);
    const description = screen.getByRole("textbox", { name: "Description" });
    expect(description.tagName).toBe("TEXTAREA");
    expect(description).toHaveAttribute("placeholder", "What you help with");
    submit();
    expect(screen.getAllByRole("alert").map((alert) => alert.textContent)).toEqual(["Choose an area", "Describe what you help with"]);
    expect(area).toHaveAttribute("aria-invalid", "true");
    expect(description).toHaveAttribute("aria-invalid", "true");
    fireEvent.change(area, { target: { value: "react" } });
    fireEvent.change(description, { target: { value: "Line one\nLine two" } });
    submit();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ area: "react", description: "Line one\nLine two" }));
  });

  it("checks a field when the person leaves it and ties the error to the field", () => {
    render(<CrudForm schema={schema} fields={fields} onSubmit={vi.fn()} />);
    const email = screen.getByLabelText("Email");
    fireEvent.blur(email);
    expect(email).not.toHaveAttribute("aria-invalid");
    expect(email).not.toHaveAttribute("aria-describedby");
    fireEvent.change(email, { target: { value: "ada@" } });
    fireEvent.blur(email);
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveAccessibleDescription("Email is invalid");
    expect(screen.getByLabelText("Name")).not.toHaveAttribute("aria-invalid");
    fireEvent.change(email, { target: { value: "ada@example.com" } });
    fireEvent.blur(email);
    expect(email).not.toHaveAttribute("aria-invalid");
    expect(email).not.toHaveAttribute("aria-describedby");
  });
});
