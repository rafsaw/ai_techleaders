import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppWelcomeNotice } from "@/app/welcome-notice";

const nav = vi.hoisted(() => ({ pathname: "/", search: "" }));
vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(nav.search),
}));

const WELCOME = "This is the name others see. You can change it.";

/** Puts the browser and the mocked router at `path`. */
function at(path: string) {
  const url = new URL(path, window.location.origin);
  window.history.replaceState({ tree: "next" }, "", path);
  nav.pathname = url.pathname;
  nav.search = url.search;
}

beforeEach(() => at("/"));
afterEach(() => window.history.replaceState(null, "", "/"));

describe("AppWelcomeNotice (SM-AC7)", () => {
  it("shows once on a welcome=1 page and drops only the flag, keeping other params and the hash", () => {
    at("/mentors?page=2&welcome=1#top");
    render(<AppWelcomeNotice displayName="Ada Lovelace" />);
    expect(screen.getByRole("status")).toHaveTextContent(WELCOME);
    expect(screen.getByText("Ada Lovelace")).toBeVisible();
    expect(screen.getByRole("link", { name: "Change it in Account settings" })).toHaveAttribute("href", "/account");
    expect(`${window.location.pathname}${window.location.search}${window.location.hash}`).toBe("/mentors?page=2#top");
    expect(window.history.state).toEqual({ tree: "next" });
  });

  it("stays visible after Next syncs the replaced address into useSearchParams", () => {
    at("/?welcome=1");
    const { rerender } = render(<AppWelcomeNotice displayName="Ada" />);
    expect(window.location.search).toBe("");
    nav.search = "";
    rerender(<AppWelcomeNotice displayName="Ada" />);
    expect(screen.getByRole("status")).toHaveTextContent(WELCOME);
  });

  it("hides on a client navigation to another page and does not come back", () => {
    at("/?welcome=1");
    const { rerender } = render(<AppWelcomeNotice displayName="Ada" />);
    expect(screen.getByRole("status")).toBeVisible();
    at("/mentors");
    rerender(<AppWelcomeNotice displayName="Ada" />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    at("/");
    rerender(<AppWelcomeNotice displayName="Ada" />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("leaves /account to its own notice and its own address handling", () => {
    at("/account?welcome=1");
    render(<AppWelcomeNotice displayName="Ada" />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(window.location.search).toBe("?welcome=1");
  });

  it.each(["/", "/mentors?welcome=0", "/mentors?page=2"])("shows nothing without the flag on %s", (path) => {
    at(path);
    const replaceState = vi.spyOn(window.history, "replaceState");
    render(<AppWelcomeNotice displayName="Ada" />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(replaceState).not.toHaveBeenCalled();
    replaceState.mockRestore();
  });
});
