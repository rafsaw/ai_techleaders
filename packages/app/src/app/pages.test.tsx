import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Principal } from "@devmentor/core";

import { apiCall } from "@devmentor/ui/api/apiCall";
import type { ApiResult } from "@devmentor/ui/api/types";

import Home from "@/app/(frontend)/page";
import BackendLayout from "@/app/backend/layout";
import Dashboard, { generateMetadata as dashboardMetadata } from "@/app/backend/page";
import UsersPage, { generateMetadata as usersMetadata } from "@/app/backend/users/page";
import { UsersPanel } from "@/app/backend/users/users-panel";
import RootLayout, { metadata } from "@/app/layout";
import NotFound, { metadata as notFoundMetadata } from "@/app/not-found";
import { getPrincipal, requireRole } from "@/server/auth/page-guards";

const { count, connection } = vi.hoisted(() => ({ count: vi.fn(), connection: vi.fn() }));
vi.mock("next/server", () => ({ connection }));
vi.mock("@/server/container", () => ({ createRequestScope: () => ({ cradle: { userService: { count } } }) }));
vi.mock("next/font/google", () => ({ Geist: () => ({ variable: "geist-font" }) }));
vi.mock("@devmentor/ui/api/apiCall", () => ({ apiCall: vi.fn() }));
vi.mock("@/server/auth/page-guards", () => ({ getPrincipal: vi.fn(), requireRole: vi.fn() }));
vi.mock("next/navigation", () => ({ notFound: vi.fn(() => { throw new Error("notFound"); }) }));

const operator: Principal = { userId: "user-1", sessionId: "session-1", displayName: "Ada", roles: ["mentee", "operator"] };

beforeEach(() => {
  vi.mocked(getPrincipal).mockReset().mockResolvedValue(null);
  vi.mocked(requireRole).mockReset().mockResolvedValue(operator);
});

describe("page composition", () => {
  it("gives operators distinct dashboard and users document titles", async () => {
    vi.mocked(getPrincipal).mockResolvedValue(operator);
    expect(await dashboardMetadata()).toEqual({ title: "Dashboard" });
    expect(await usersMetadata()).toEqual({ title: "Users" });
  });

  it.each([null, { ...operator, roles: ["mentee"] } satisfies Principal])(
    "gives anyone else the 404's title, so metadata does not reveal the area: %j", async (principal) => {
      vi.mocked(getPrincipal).mockResolvedValue(principal);
      expect(await dashboardMetadata()).toEqual({ title: "Page not found" });
      expect(await usersMetadata()).toEqual({ title: "Page not found" });
    });

  it("renders the public heading without a backend link, reading the principal for activity", async () => {
    render(await Home());
    expect(getPrincipal).toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "DevMentor" })).toBeVisible();
    // The (frontend) header carries the sign-in state and Backend for operators.
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("provides backend navigation around the page for an operator", async () => {
    vi.mocked(getPrincipal).mockResolvedValue(operator);
    render(await BackendLayout({ children: <h1>Page content</h1> }));
    expect(screen.getByRole("heading", { name: "Page content" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Users" })).toHaveAttribute("href", "/backend/users");
    expect(screen.getByRole("link", { name: "View site" })).toHaveAttribute("href", "/");
  });

  it("renders no backend chrome when signed out and leaves the redirect to the page guard", async () => {
    render(<>{await BackendLayout({ children: <p>Page output</p> })}</>);
    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Users" })).not.toBeInTheDocument();
    expect(screen.getByText("Page output")).toBeVisible();
  });

  it("answers 404 to a signed-in account without the operator role", async () => {
    vi.mocked(getPrincipal).mockResolvedValue({ ...operator, roles: ["mentee"] });
    await expect(BackendLayout({ children: <p>Page output</p> })).rejects.toThrow("notFound");
  });

  it("renders the neutral 404 with a way home", () => {
    render(<NotFound />);
    expect(notFoundMetadata.title).toBe("Page not found");
    expect(screen.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Go to the home page" })).toHaveAttribute("href", "/");
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

  it("guards the dashboard, then queries the database only at request time", async () => {
    const order: string[] = [];
    vi.mocked(requireRole).mockImplementation(async () => { order.push("guard"); return operator; });
    connection.mockImplementation(async () => { order.push("connection"); });
    count.mockImplementation(async () => { order.push("count"); return 7; });
    render(await Dashboard());
    expect(requireRole).toHaveBeenCalledWith("operator", { returnTo: "/backend" });
    expect(order).toEqual(["guard", "connection", "count"]);
    expect(screen.getByText("Connected")).toBeVisible();
    expect(screen.getByText("7 registered users")).toBeVisible();
  });

  it("does not query the database when the guard redirects or answers 404", async () => {
    count.mockReset();
    vi.mocked(requireRole).mockRejectedValue(new Error("redirect:/sign-in?returnTo=%2Fbackend"));
    await expect(Dashboard()).rejects.toThrow("redirect:/sign-in?returnTo=%2Fbackend");
    expect(count).not.toHaveBeenCalled();
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
  it("does not render the users page when the guard redirects or answers 404", async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error("notFound"));
    await expect(UsersPage()).rejects.toThrow("notFound");
    expect(apiCall).not.toHaveBeenCalled();
  });

  it("renders loading, the empty list, and the create form on the users page", async () => {
    let resolve!: (result: ApiResult<typeof user[]>) => void;
    vi.mocked(apiCall).mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    render(await UsersPage());
    expect(requireRole).toHaveBeenCalledWith("operator", { returnTo: "/backend/users" });
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
