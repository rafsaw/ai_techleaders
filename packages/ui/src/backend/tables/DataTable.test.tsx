import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DataTable } from "./DataTable";

const rows = Array.from({ length: 21 }, (_, index) => ({ id: String(index), name: `User ${index}` }));
const columns = [{ id: "name", header: "Name", className: "font-bold", cell: (row: typeof rows[number]) => row.name }];
const getRowId = (row: typeof rows[number]) => row.id;

describe("DataTable", () => {
  it("prioritizes errors over loading and offers retry", () => {
    const onRetry = vi.fn();
    render(<DataTable columns={columns} getRowId={getRowId} rows={undefined} isLoading error="Unavailable" onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Unavailable");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("loads when rows are absent or a refresh is pending", () => {
    const { rerender } = render(<DataTable columns={columns} getRowId={getRowId} rows={undefined} />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
    rerender(<DataTable columns={columns} getRowId={getRowId} rows={rows} isLoading />);
    expect(screen.getByRole("status")).toBeVisible();
  });

  it("renders default and configured empty states", () => {
    const { rerender } = render(<DataTable columns={columns} getRowId={getRowId} rows={[]} />);
    expect(screen.getByText("Nothing here yet")).toBeVisible();
    rerender(<DataTable columns={columns} getRowId={getRowId} rows={[]} emptyState={{ title: "No users", description: "Create one" }} />);
    expect(screen.getByText("No users")).toBeVisible();
    expect(screen.getByText("Create one")).toBeVisible();
  });

  it("renders column classes and a single page without actions or pagination", () => {
    render(<DataTable columns={columns} getRowId={getRowId} rows={rows.slice(0, 1)} />);
    expect(screen.getByRole("columnheader", { name: "Name" })).toHaveClass("font-bold");
    expect(screen.getByRole("cell", { name: "User 0" })).toHaveClass("font-bold");
    expect(screen.queryByRole("columnheader", { name: "Actions" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument();
  });

  it("paginates, renders row actions, and clamps a shrinking result", () => {
    const action = vi.fn();
    const rowActions = (row: typeof rows[number]) => <button onClick={() => action(row.id)}>Edit {row.id}</button>;
    const { rerender } = render(<DataTable columns={columns} getRowId={getRowId} rows={rows} rowActions={rowActions} pageSize={10} />);
    expect(screen.getByRole("columnheader", { name: "Actions" })).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 3")).toBeVisible();
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Edit 0" }));
    expect(action).toHaveBeenCalledWith("0");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("cell", { name: "User 10" })).toBeVisible();
    expect(screen.queryByRole("cell", { name: "User 0" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(screen.getByText("Page 1 of 3")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    expect(screen.getByRole("cell", { name: "User 20" })).toBeVisible();
    rerender(<DataTable columns={columns} getRowId={getRowId} rows={rows.slice(0, 11)} rowActions={rowActions} pageSize={10} />);
    expect(screen.getByText("Page 2 of 2")).toBeVisible();
    expect(screen.getByRole("cell", { name: "User 10" })).toBeVisible();
  });
});
