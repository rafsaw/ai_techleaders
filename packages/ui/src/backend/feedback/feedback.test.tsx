import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EmptyState } from "./EmptyState";
import { ErrorMessage } from "./ErrorMessage";
import { LoadingMessage } from "./LoadingMessage";

describe("shared feedback", () => {
  it("renders a minimal empty state and optional guidance/action", () => {
    const { rerender } = render(<EmptyState title="No users" />);
    expect(screen.getByText("No users")).toBeVisible();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    rerender(<EmptyState title="No users" description="Add the first user" action={<button>Add user</button>} />);
    expect(screen.getByText("Add the first user")).toBeVisible();
    expect(screen.getByRole("button", { name: "Add user" })).toBeVisible();
  });

  it("announces an error and retries only when a callback exists", () => {
    const onRetry = vi.fn();
    const { rerender } = render(<ErrorMessage message="Database unavailable" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't load the data");
    expect(screen.getByRole("alert").querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    rerender(<ErrorMessage title="Could not load" message="Database unavailable" onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load");
    expect(screen.getByRole("alert")).toHaveTextContent("Database unavailable");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("announces loading once and accepts a specific label", () => {
    const { rerender } = render(<LoadingMessage />);
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
    expect(screen.getByRole("status")).toHaveClass("gap-in-group", "py-component", "text-body");
    rerender(<LoadingMessage label="Fetching users" />);
    expect(screen.getByRole("status")).toHaveTextContent("Fetching users");
  });
});
