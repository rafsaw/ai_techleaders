import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { apiCall } from "@devmentor/ui/backend/api/apiCall";
import type { ApiResult } from "@devmentor/ui/backend/api/types";

import Home from "@/app/(frontend)/page";
import BackendLayout from "@/app/backend/layout";
import Dashboard, { metadata as dashboardMetadata } from "@/app/backend/page";
import UsersPage, { metadata as usersMetadata } from "@/app/backend/users/page";
import { UsersPanel } from "@/app/backend/users/users-panel";
import RootLayout, { metadata } from "@/app/layout";

const { count, connection } = vi.hoisted(() => ({ count: vi.fn(), connection: vi.fn() }));
vi.mock("next/server", () => ({ connection }));
vi.mock("@/server/container", () => ({ createRequestScope: () => ({ cradle: { userService: { count } } }) }));
vi.mock("next/font/google", () => ({ Geist: () => ({ variable: "geist-font" }) }));
vi.mock("@devmentor/ui/backend/api/apiCall", () => ({ apiCall: vi.fn() }));

describe("page composition", () => {
  it("declares distinct dashboard and users document titles", () => {
    expect(dashboardMetadata.title).toBe("Dashboard");
    expect(usersMetadata.title).toBe("Users");
  });

  it("renders the public heading and admin link", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { name: "DevMentor" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Open backend" })).toHaveAttribute("href", "/backend");
  });

  it("provides backend navigation and preserves page content", () => {
    render(<BackendLayout><h1>Page content</h1></BackendLayout>);
    expect(screen.getByRole("heading", { name: "Page content" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Users" })).toHaveAttribute("href", "/backend/users");
    expect(screen.getByRole("link", { name: "View site" })).toHaveAttribute("href", "/");
  });

  it("defines the root document language, font, metadata and body", () => {
    // Invoke document composition directly; a nested html element is invalid in jsdom.
    const document = RootLayout({ children: <p>Content</p> });
    expect(document.type).toBe("html");
    expect(document.props.lang).toBe("en");
    expect(document.props.className).toContain("geist-font");
    expect(document.props.children.type).toBe("body");
    expect(document.props.children.props.children.props.children).toBe("Content");
    expect(metadata.title).toEqual({ default: "DevMentor", template: "%s · DevMentor" });
  });

  it("queries the database only after entering request-time rendering", async () => {
    const order: string[] = [];
    connection.mockImplementation(async () => { order.push("connection"); });
    count.mockImplementation(async () => { order.push("count"); return 7; });
    render(await Dashboard());
    expect(order).toEqual(["connection", "count"]);
    expect(screen.getByText("Connected")).toBeVisible();
    expect(screen.getByText("7 registered users")).toBeVisible();
  });

  it.each([new Error("Database offline"), "Database offline"])("renders database failure: %s", async (failure) => {
    count.mockRejectedValue(failure);
    render(await Dashboard());
    expect(screen.getByText("Unavailable")).toBeVisible();
    expect(screen.getByText("Database offline")).toBeVisible();
  });
});

const user = { id: "user-1", name: "Ada", email: "ada@example.com", createdAt: "2026-10-14T12:00:00.000Z" };

describe("users panel", () => {
  it("renders loading, the empty list, and the create form on the users page", async () => {
    let resolve!: (result: ApiResult<typeof user[]>) => void;
    vi.mocked(apiCall).mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    render(<UsersPage />);
    expect(screen.getByRole("heading", { name: "Users" })).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("Loading");
    await act(async () => { resolve({ ok: true, data: [] }); });
    expect(screen.getByText("No users yet")).toBeVisible();
    expect(screen.getByLabelText("Name")).toHaveValue("");
    expect(screen.getByLabelText("Email")).toHaveValue("");
  });

  it("retries a failed load and renders name/email/date columns", async () => {
    vi.mocked(apiCall).mockResolvedValueOnce({ ok: false, error: { code: "network_error", message: "Offline" } });
    vi.mocked(apiCall).mockResolvedValueOnce({ ok: true, data: [user] });
    render(<UsersPanel />);
    expect(await screen.findByText("Offline")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("cell", { name: "Ada" })).toBeVisible();
    expect(screen.getByRole("cell", { name: "ada@example.com" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Created" })).toBeVisible();
    expect(screen.getAllByRole("cell")[2]).toHaveTextContent("2026");
  });

  it("submits normalized input then reloads the list", async () => {
    vi.mocked(apiCall).mockResolvedValueOnce({ ok: true, data: [] });
    vi.mocked(apiCall).mockResolvedValueOnce({ ok: true, data: user });
    vi.mocked(apiCall).mockResolvedValueOnce({ ok: true, data: [user] });
    render(<UsersPanel />);
    await screen.findByText("No users yet");
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: " Ada " } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ADA@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Create user" }));
    expect(await screen.findByRole("cell", { name: "Ada" })).toBeVisible();
    expect(apiCall).toHaveBeenCalledWith("/api/users", { method: "POST", body: { name: "Ada", email: "ada@example.com" } });
    expect(screen.getByLabelText("Name")).toHaveValue("");
  });

  it("ignores a response from an unmounted panel", async () => {
    let resolve!: (result: ApiResult<typeof user[]>) => void;
    vi.mocked(apiCall).mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    const view = render(<UsersPanel />);
    view.unmount();
    await act(async () => { resolve({ ok: true, data: [user] }); });
    await waitFor(() => expect(screen.queryByText("Ada")).not.toBeInTheDocument());
  });

  it.each([
    { ok: true, data: [] },
    { ok: false, error: { code: "network_error", message: "Stale failure" } },
  ] satisfies ApiResult<typeof user[]>[])("preserves the refreshed list when a superseded request finishes: %j", async (staleResult) => {
    let resolveInitial!: (result: ApiResult<typeof user[]>) => void;
    vi.mocked(apiCall).mockImplementationOnce(() => new Promise((resolve) => { resolveInitial = resolve; }));
    vi.mocked(apiCall).mockResolvedValueOnce({ ok: true, data: user });
    vi.mocked(apiCall).mockResolvedValueOnce({ ok: true, data: [user] });
    render(<UsersPanel />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading");

    // Create can complete before the initial GET; success starts a newer GET.
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Ada" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ada@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Create user" }));
    expect(await screen.findByRole("cell", { name: "Ada" })).toBeVisible();

    await act(async () => { resolveInitial(staleResult); });
    expect(screen.getByRole("cell", { name: "Ada" })).toBeVisible();
    expect(screen.getByRole("cell", { name: "ada@example.com" })).toBeVisible();
    expect(screen.queryByText("No users yet")).not.toBeInTheDocument();
    expect(screen.queryByText("Stale failure")).not.toBeInTheDocument();
  });
});
