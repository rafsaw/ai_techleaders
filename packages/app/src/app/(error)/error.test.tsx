import "@testing-library/jest-dom/vitest";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// /error must render when principal resolution or the database is failing, so
// every identity/DB entry point throws as soon as anything imports or calls it.
const { unavailable } = vi.hoisted(() => ({
  unavailable: (name: string) => () => { throw new Error(`/error must not use ${name}`); },
}));
vi.mock("@/server/container", unavailable("the container"));
vi.mock("@/server/http", unavailable("the HTTP wrappers"));
vi.mock("@devmentor/db", unavailable("the database"));
vi.mock("next/headers", unavailable("request cookies/headers"));

import ErrorLayout from "@/app/(error)/layout";
import ErrorPage, { metadata } from "@/app/(error)/error/page";

const GENERIC = "We couldn't complete your request. Please try again in a moment.";

async function renderError(searchParams: Record<string, string | string[] | undefined>) {
  return render(<ErrorLayout>{await ErrorPage({ searchParams: Promise.resolve(searchParams) })}</ErrorLayout>);
}

describe("/error", () => {
  it("renders the generic internal error with one h1, a brand-only header and a home link", async () => {
    await renderError({ code: "internal_error" });
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: "Something went wrong" })).toBeVisible();
    expect(screen.getByText(GENERIC)).toBeVisible();
    expect(screen.queryByText(/internal_error/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to the home page" })).toHaveAttribute("href", "/");

    const header = screen.getByRole("banner");
    expect(within(header).getAllByRole("link")).toHaveLength(1);
    expect(within(header).getByRole("link", { name: "DevMentor" })).toHaveAttribute("href", "/");
    // No personalized navigation: neither signed-in nor signed-out controls.
    expect(screen.queryByText(/sign in|sign out|account|backend/i)).not.toBeInTheDocument();
    expect(metadata.title).toBe("Something went wrong");
  });

  it.each([
    ["unauthorized", "You need to be signed in to do that. Sign in, then try again."],
    ["forbidden", "Your account doesn't have access to that page."],
    ["not_found", "We couldn't find what you were looking for."],
  ])("explains the known code %s in plain words", async (code, message) => {
    await renderError({ code });
    expect(screen.getByRole("heading", { level: 1, name: "Something went wrong" })).toBeVisible();
    expect(screen.getByText(message)).toBeVisible();
    expect(screen.queryByText(code)).not.toBeInTheDocument();
  });

  it.each([{}, { code: "made_up" }, { code: "toString" }, { code: ["not_found", "forbidden"] }])(
    "falls back to the generic message for %j", async (searchParams) => {
      await renderError(searchParams);
      expect(screen.getByText(GENERIC)).toBeVisible();
    });
});
