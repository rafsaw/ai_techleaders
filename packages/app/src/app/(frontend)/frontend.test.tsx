import "@testing-library/jest-dom/vitest";
import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Principal } from "@devmentor/core";

import FrontendLayout from "@/app/(frontend)/layout";
import SignInPage, { metadata } from "@/app/(frontend)/sign-in/page";
import { getPrincipal } from "@/server/auth/page-guards";

vi.mock("@/server/auth/page-guards", () => ({ getPrincipal: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  redirect: vi.fn((path: string) => { throw new Error(`redirect:${path}`); }),
}));

const ada: Principal = { userId: "user-1", sessionId: "session-1", displayName: "Ada Lovelace", roles: ["mentee"] };

beforeEach(() => {
  vi.mocked(getPrincipal).mockResolvedValue(null);
});

function signInPage(searchParams: Record<string, string | string[] | undefined> = {}) {
  return SignInPage({ searchParams: Promise.resolve(searchParams) });
}

describe("(frontend) layout", () => {
  it("shows Sign in in the header when signed out", async () => {
    render(await FrontendLayout({ children: <main>Public content</main> }));
    const header = screen.getByRole("banner");
    expect(within(header).getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in");
    expect(screen.getByText("Public content")).toBeVisible();
  });

  it("shows the display name and Sign out when signed in", async () => {
    vi.mocked(getPrincipal).mockResolvedValue({ ...ada, roles: ["mentee", "operator"] });
    render(await FrontendLayout({ children: <main>Public content</main> }));
    const header = screen.getByRole("banner");
    expect(within(header).getByRole("link", { name: "Ada Lovelace" })).toHaveAttribute("href", "/account");
    expect(within(header).getByRole("link", { name: "Backend" })).toHaveAttribute("href", "/backend");
    expect(within(header).getByRole("button", { name: "Sign out" })).toBeVisible();
    expect(within(header).queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();
  });
});

describe("/sign-in", () => {
  it("offers GitHub first as a real link, with one h1 and no banner", async () => {
    render(await signInPage());
    expect(metadata.title).toBe("Sign in");
    expect(screen.getByRole("heading", { level: 1, name: "Sign in" })).toBeVisible();
    const main = screen.getByRole("main");
    const github = within(main).getAllByRole("link")[0]!;
    expect(github).toHaveAccessibleName("Sign in with GitHub");
    expect(github).toHaveAttribute("href", "/api/auth/github");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    // Phase 1 is GitHub only: no email form yet.
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(getPrincipal).toHaveBeenCalled();
  });

  it("keeps a safe returnTo in the GitHub link", async () => {
    render(await signInPage({ returnTo: "/account?tab=name" }));
    expect(screen.getByRole("link", { name: "Sign in with GitHub" }))
      .toHaveAttribute("href", "/api/auth/github?returnTo=%2Faccount%3Ftab%3Dname");
  });

  it.each(["https://evil.example", "//evil.example", "/api/users", ["/account", "/other"]])(
    "drops an unsafe or repeated returnTo %j", async (returnTo) => {
      render(await signInPage({ returnTo }));
      const href = screen.getByRole("link", { name: "Sign in with GitHub" }).getAttribute("href");
      expect(href).toBe(Array.isArray(returnTo) ? "/api/auth/github?returnTo=%2Faccount" : "/api/auth/github");
    });

  it("shows the cancelled banner as status, without the email option in Phase 1", async () => {
    render(await signInPage({ error: "github_cancelled" }));
    expect(screen.getByRole("status")).toHaveTextContent("GitHub sign-in was cancelled.Try again");
  });

  it.each([
    ["github_failed", "GitHub sign-in failed."],
    ["github_no_verified_email", "Your GitHub account has no verified email."],
    ["github_email_taken", "An account with this email is linked to a different GitHub account."],
  ])("shows the %s banner as an alert", async (error, text) => {
    render(await signInPage({ error }));
    expect(screen.getByRole("alert")).toHaveTextContent(text);
  });

  it("ignores an unknown error code", async () => {
    render(await signInPage({ error: "made_up" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it.each([
    [{}, "redirect:/"],
    [{ returnTo: "/account" }, "redirect:/account"],
    [{ returnTo: "https://evil.example" }, "redirect:/"],
  ])("sends a signed-in visitor to the safe returnTo (SM-AC1): %j", async (searchParams, target) => {
    vi.mocked(getPrincipal).mockResolvedValue(ada);
    await expect(signInPage(searchParams)).rejects.toThrow(target);
  });
});
