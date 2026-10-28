import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { apiCall } from "@devmentor/ui/api/apiCall";

import { navigateFully } from "@/app/full-navigation";
import { AppSiteHeader } from "@/app/site-header";

const { pathname } = vi.hoisted(() => ({ pathname: { current: "/" } }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => <a href={href} {...props}>{children}</a>,
}));
vi.mock("@devmentor/ui/api/apiCall", () => ({ apiCall: vi.fn() }));
vi.mock("@/app/full-navigation", () => ({ navigateFully: vi.fn() }));

const ada = { displayName: "Ada Lovelace", roles: ["mentee"] as const };

beforeEach(() => {
  pathname.current = "/";
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("AppSiteHeader", () => {
  it.each([
    ["/", "/sign-in"],
    ["/sign-in", "/sign-in"],
    ["/account", "/sign-in?returnTo=%2Faccount"],
  ])("signed out on %s offers Sign in at %s", (path, href) => {
    pathname.current = path;
    render(<AppSiteHeader account={null} />);
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", href);
    expect(screen.queryByRole("button", { name: "Sign out" })).not.toBeInTheDocument();
  });

  it("signed in shows the display name linking to /account, Backend only for operators, and Sign out", () => {
    const { rerender } = render(<AppSiteHeader account={ada} />);
    expect(screen.getByRole("link", { name: "Ada Lovelace" })).toHaveAttribute("href", "/account");
    expect(screen.queryByRole("link", { name: "Backend" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();
    rerender(<AppSiteHeader account={{ displayName: "Op", roles: ["mentee", "operator"] }} />);
    expect(screen.getByRole("link", { name: "Backend" })).toHaveAttribute("href", "/backend");
  });

  it("never links a mentor to Mentor setup while E01 runs standalone (the page ships in E02 Phase 1)", () => {
    render(<AppSiteHeader account={{ displayName: "Ada", roles: ["mentee", "mentor"] }} />);
    expect(screen.getByRole("link", { name: "Ada" })).toHaveAttribute("href", "/account");
    expect(screen.queryByRole("link", { name: "Mentor setup" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link").map((link) => link.getAttribute("href"))).not.toContain("/mentor");
  });

  it("signs out through the API and then navigates fully to the answered destination", async () => {
    vi.mocked(apiCall).mockResolvedValue({ ok: true, data: { redirectTo: "/" } });
    render(<AppSiteHeader account={ada} />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Sign out" })));
    expect(apiCall).toHaveBeenCalledWith("/api/auth/sign-out", { method: "POST" });
    expect(navigateFully).toHaveBeenCalledWith("/");
  });

  it("stays on the page with an error when sign-out fails", async () => {
    vi.mocked(apiCall).mockResolvedValue({ ok: false, error: { code: "network_error", message: "Offline" } });
    render(<AppSiteHeader account={ada} />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Sign out" })));
    expect(screen.getByRole("alert")).toHaveTextContent("Could not sign out. Try again.");
    expect(navigateFully).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "Ada Lovelace" })).toBeVisible();
  });

  it("recovers when the sign-out answer breaks off mid-body: error shown and Sign out clickable again", async () => {
    // The real transport, so a body-read failure goes through apiCall's own handling.
    const actual = await vi.importActual<typeof import("@devmentor/ui/api/apiCall")>("@devmentor/ui/api/apiCall");
    vi.mocked(apiCall).mockImplementation(actual.apiCall);
    const broken = new Response('{"ok":true,"data":{"redirectTo":"/"}}');
    vi.spyOn(broken, "text").mockRejectedValue(new TypeError("connection reset"));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(broken));

    render(<AppSiteHeader account={ada} />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Sign out" })));

    expect(screen.getByRole("alert")).toHaveTextContent("Could not sign out. Try again.");
    const button = screen.getByRole("button", { name: "Sign out" });
    expect(button).toBeEnabled();
    expect(screen.queryByText("Signing out…")).not.toBeInTheDocument();
    expect(navigateFully).not.toHaveBeenCalled();

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ ok: true, data: { redirectTo: "/" } })));
    await act(async () => fireEvent.click(button));
    expect(navigateFully).toHaveBeenCalledWith("/");
  });
});
