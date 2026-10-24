import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "./empty";
import { Skeleton } from "./skeleton";
import { Spinner } from "./spinner";

describe("loading and empty primitives", () => {
  it("renders a skeleton hidden from assistive technology, sized by the caller", () => {
    const { container, rerender } = render(<Skeleton className="h-6 w-40" />);
    const block = container.querySelector("[data-slot=skeleton]");
    expect(block).toHaveAttribute("aria-hidden", "true");
    expect(block).toHaveClass("animate-pulse", "rounded-control", "bg-muted", "h-6", "w-40");
    rerender(<Skeleton className="h-badge rounded-pill" />);
    expect(container.querySelector("[data-slot=skeleton]")).toHaveClass("rounded-pill");
    expect(container.querySelector("[data-slot=skeleton]")).not.toHaveClass("rounded-control");
  });

  it("announces a lone spinner and hides one next to a label", () => {
    const { rerender } = render(<Spinner className="size-3.5" />);
    const spinner = screen.getByRole("status", { name: "Loading" });
    expect(spinner).toHaveClass("size-3.5", "animate-spin");
    expect(spinner).not.toHaveClass("size-4");
    rerender(<button disabled><Spinner aria-hidden />Publishing slot…</button>);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publishing slot…" })).toBeDisabled();
  });

  it("lays out an empty state left-aligned on tokens, with an optional icon box", () => {
    const { container } = render(
      <Empty className="custom">
        <EmptyMedia variant="icon" className="custom-media"><svg /></EmptyMedia>
        <EmptyMedia><svg /></EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>No upcoming slots</EmptyTitle>
          <EmptyDescription>Mentees can only book times you publish.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent><a href="/mentor/slots">Publish slots</a></EmptyContent>
      </Empty>
    );
    expect(container.querySelector("[data-slot=empty]")).toHaveClass("items-start", "text-left", "py-component", "custom");
    const [icon, plain] = container.querySelectorAll("[data-slot=empty-icon]");
    expect(icon).toHaveAttribute("data-variant", "icon");
    expect(icon).toHaveClass("rounded-control", "bg-muted", "custom-media");
    expect(plain).toHaveAttribute("data-variant", "default");
    expect(plain).toHaveClass("bg-transparent");
    expect(screen.getByText("No upcoming slots")).toHaveClass("text-row-title");
    expect(screen.getByText("Mentees can only book times you publish.")).toHaveClass("text-body", "text-muted-foreground");
    expect(screen.getByRole("link", { name: "Publish slots" }).parentElement).toHaveAttribute("data-slot", "empty-content");
  });
});
