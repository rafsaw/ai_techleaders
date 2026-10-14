import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSeparator, FieldSet, FieldTitle } from "./field";

describe("form field primitives", () => {
  it("composes a labeled fieldset and forwards classes and attributes", () => {
    const { container, rerender } = render(<FieldSet className="custom"><FieldLegend className="custom">Profile</FieldLegend>
      <FieldGroup className="custom"><Field className="custom" data-invalid="true">
        <FieldContent className="custom"><FieldTitle className="custom">Contact</FieldTitle>
          <FieldLabel className="custom" htmlFor="name">Name</FieldLabel>
          <FieldDescription className="custom">Your display name</FieldDescription>
          <input id="name" />
        </FieldContent>
      </Field></FieldGroup>
    </FieldSet>);
    expect(screen.getByRole("group", { name: "Profile" })).toHaveAttribute("data-slot", "field-set");
    expect(screen.getByLabelText("Name")).toBeVisible();
    expect(screen.getByText("Profile")).toHaveAttribute("data-variant", "legend");
    expect(container.querySelector('[data-slot="field"]')).toHaveAttribute("data-orientation", "vertical");
    for (const slot of ["field-set", "field-legend", "field-group", "field", "field-content", "field-description", "field-label"]) {
      expect(container.querySelector(`[data-slot="${slot}"]`)).toHaveClass("custom");
    }
    rerender(<FieldSet><FieldLegend variant="label">Details</FieldLegend><Field orientation="horizontal">Horizontal</Field><Field orientation="responsive">Responsive</Field></FieldSet>);
    expect(screen.getByText("Details")).toHaveAttribute("data-variant", "label");
    expect(screen.getByText("Horizontal")).toHaveAttribute("data-orientation", "horizontal");
    expect(screen.getByText("Responsive")).toHaveAttribute("data-orientation", "responsive");
  });

  it("renders separator content only when supplied", () => {
    const { container, rerender } = render(<FieldSeparator className="custom" />);
    expect(container.querySelector('[data-slot="field-separator"]')).toHaveAttribute("data-content", "false");
    expect(container.querySelector('[data-slot="field-separator"]')).toHaveClass("custom");
    expect(screen.getByRole("separator")).toBeInTheDocument();
    rerender(<FieldSeparator>Or</FieldSeparator>);
    expect(screen.getByText("Or")).toHaveAttribute("data-slot", "field-separator-content");
    expect(container.querySelector('[data-slot="field-separator"]')).toHaveAttribute("data-content", "true");
  });

  it("omits absent, empty, undefined, and messageless errors", () => {
    const { rerender } = render(<FieldError />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    for (const errors of [[], [undefined], [{}]]) {
      rerender(<FieldError errors={errors} />);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    }
  });

  it("prefers supplied content and deduplicates a single message", () => {
    const { rerender } = render(<FieldError errors={[{ message: "Ignored" }]} className="custom">Custom error</FieldError>);
    expect(screen.getByRole("alert")).toHaveTextContent("Custom error");
    expect(screen.getByRole("alert")).toHaveClass("custom");
    expect(screen.queryByText("Ignored")).not.toBeInTheDocument();
    rerender(<FieldError errors={[{ message: "Required" }, { message: "Required" }]} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Required");
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("lists distinct messages and ignores missing messages within the list", () => {
    render(<FieldError errors={[{ message: "Required" }, undefined, {}, { message: "Too short" }, { message: "Required" }, { message: "" }]} />);
    expect(screen.getAllByRole("listitem").map((node) => node.textContent)).toEqual(["Required", "Too short"]);
    expect(screen.getByRole("alert")).toHaveAttribute("data-slot", "field-error");
  });
});
