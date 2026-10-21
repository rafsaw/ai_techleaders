import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./button";
import { Input } from "./input";
import { NativeSelect, NativeSelectOptGroup, NativeSelectOption } from "./native-select";
import { Textarea } from "./textarea";

describe("form controls", () => {
  it("renders a labelled textarea that forwards classes, state and changes", () => {
    const onChange = vi.fn();
    render(<><label htmlFor="description">Description</label>
      <Textarea id="description" className="font-mono" aria-invalid onChange={onChange} /></>);
    const textarea = screen.getByRole("textbox", { name: "Description" });
    expect(textarea).toHaveAttribute("data-slot", "textarea");
    expect(textarea).toHaveClass("font-mono", "rounded-control", "text-control");
    expect(textarea).toBeInvalid();
    fireEvent.change(textarea, { target: { value: "Line one\nLine two" } });
    expect(onChange).toHaveBeenCalledOnce();
    expect(textarea).toHaveValue("Line one\nLine two");
  });

  it("renders a native select with options, groups and both sizes", () => {
    const onChange = vi.fn();
    const { container, rerender } = render(<><label htmlFor="country">Country</label>
      <NativeSelect id="country" className="w-full" defaultValue="" onChange={onChange}>
        <NativeSelectOption value="">Choose a country</NativeSelectOption>
        <NativeSelectOption value="US" className="custom">United States</NativeSelectOption>
        <NativeSelectOptGroup label="European Economic Area" className="custom">
          <NativeSelectOption value="PL">Poland</NativeSelectOption>
        </NativeSelectOptGroup>
      </NativeSelect></>);
    const select = screen.getByRole("combobox", { name: "Country" });
    expect(select).toHaveAttribute("data-size", "default");
    expect(container.querySelector('[data-slot="native-select-wrapper"]')).toHaveClass("w-full");
    expect(screen.getByRole("option", { name: "United States" })).toHaveClass("custom", "bg-popover");
    expect(screen.getByRole("group", { name: "European Economic Area" })).toHaveClass("custom");
    fireEvent.change(select, { target: { value: "PL" } });
    expect(onChange).toHaveBeenCalledOnce();
    expect(select).toHaveValue("PL");
    rerender(<NativeSelect aria-label="Area" size="sm" disabled><NativeSelectOption value="react">React</NativeSelectOption></NativeSelect>);
    expect(screen.getByRole("combobox", { name: "Area" })).toHaveAttribute("data-size", "sm");
    expect(screen.getByRole("combobox", { name: "Area" })).toBeDisabled();
  });

  it("styles disabled controls with the disabled tokens instead of opacity (B2)", () => {
    render(<><Button disabled>Continue to Stripe</Button><Input aria-label="Price" disabled /></>);
    const button = screen.getByRole("button", { name: "Continue to Stripe" });
    expect(button).toHaveAttribute("data-disabled");
    expect(button).toHaveClass("data-disabled:bg-disabled", "data-disabled:text-disabled-foreground");
    expect(button.className).not.toMatch(/opacity/);
    expect(screen.getByRole("textbox", { name: "Price" })).toHaveClass("disabled:bg-disabled");
  });

  it("keeps a disabled button focusable when it explains why", () => {
    const onClick = vi.fn();
    render(<Button disabled focusableWhenDisabled aria-describedby="reason" onClick={onClick}>Continue to Stripe</Button>);
    const button = screen.getByRole("button", { name: "Continue to Stripe" });
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).not.toBeDisabled();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});
