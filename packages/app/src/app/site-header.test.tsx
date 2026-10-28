import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
});
