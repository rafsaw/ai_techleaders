import "@testing-library/jest-dom/vitest";
import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PublicMentorSummaryDto } from "@/server/services/mentors/mentor-profile.service";

import MentorsPage, { metadata } from "@/app/(frontend)/mentors/page";
import { getPrincipal } from "@/server/auth/page-guards";

const { connection, listBookable } = vi.hoisted(() => ({ connection: vi.fn(), listBookable: vi.fn() }));
vi.mock("next/server", () => ({ connection }));
vi.mock("@/server/auth/page-guards", () => ({ getPrincipal: vi.fn() }));
vi.mock("@/server/container", () => ({
  createRequestScope: () => ({ cradle: { mentorProfileService: { listBookable } } }),
}));

const ada: PublicMentorSummaryDto = {
  id: "profile-1",
  displayName: "Ada Lovelace",
  area: "typescript",
  descriptionExcerpt: "TypeScript systems and type-level puzzles.",
};
const grace: PublicMentorSummaryDto = {
  id: "profile-2",
  displayName: "Grace Hopper",
  area: "react",
  descriptionExcerpt: "React rendering and state.",
};

function page(searchParams: Record<string, string | string[] | undefined> = {}) {
  return MentorsPage({ params: Promise.resolve({}), searchParams: Promise.resolve(searchParams) });
}

beforeEach(() => {
  connection.mockReset().mockResolvedValue(undefined);
  listBookable.mockReset().mockResolvedValue([ada, grace]);
  vi.mocked(getPrincipal).mockReset().mockResolvedValue(null);
});

describe("/mentors", () => {
  it("lists bookable mentors to a signed-out visitor at request time, without prices or ratings", async () => {
    const { container } = render(await page());
    expect(connection).toHaveBeenCalledOnce();
    // Signed out resolves to no principal and still renders the full listing: no guard, no redirect.
    expect(getPrincipal).toHaveBeenCalledOnce();
    expect(getPrincipal).toHaveResolvedWith(null);
    expect(listBookable).toHaveBeenCalledWith(undefined);
    expect(metadata.title).toBe("Find a mentor");
    expect(metadata.description).toMatch(/TypeScript, React or Python/);
    expect(screen.getByRole("heading", { level: 1, name: "Find a mentor" })).toBeVisible();
    expect(screen.getByText("Showing all mentors.")).toBeVisible();

    const mentors = screen.getByRole("list", { name: "Mentors" });
    expect(within(mentors).getAllByRole("listitem")).toHaveLength(2);
    expect(within(mentors).getByRole("heading", { level: 2, name: "Ada Lovelace" })).toBeVisible();
    expect(within(mentors).getByRole("link", { name: "Ada Lovelace" })).toHaveAttribute("href", "/mentors/profile-1");
    expect(within(mentors).getByText("TypeScript systems and type-level puzzles.")).toBeVisible();
    expect(within(mentors).getByText("TypeScript")).toBeVisible();
    expect(within(mentors).getByText("React")).toBeVisible();
    expect(container.textContent).not.toMatch(/\$|price|rating|review|available/i);
  });

  it.each(["typescript", "react", "python"] as const)("filters by the approved area %s", async (area) => {
    listBookable.mockResolvedValue([grace]);
    render(await page({ area }));
    expect(listBookable).toHaveBeenCalledWith(area);
    // The chosen filter is named in text, not only implied by the filled link.
    expect(screen.getByText(/^Showing \w+ mentors\.$/)).toBeVisible();
    // The card hands the profile the filter back, so "Back to mentors" can return to it.
    expect(screen.getByRole("link", { name: "Grace Hopper" })).toHaveAttribute(
      "href",
      `/mentors/profile-2?fromArea=${area}`
    );
    const filter = screen.getByRole("navigation", { name: "Area" });
    expect(within(filter).getAllByRole("link")).toHaveLength(4);
    expect(within(filter).getByRole("link", { current: "page" })).toHaveAttribute("href", `/mentors?area=${area}`);
  });

  it.each([{}, { area: "" }])("treats a missing or empty area as All mentors: %j", async (searchParams) => {
    render(await page(searchParams));
    expect(listBookable).toHaveBeenCalledWith(undefined);
    const filter = screen.getByRole("navigation", { name: "Area" });
    expect(within(filter).getByRole("link", { current: "page" })).toHaveAttribute("href", "/mentors");
    expect(screen.getByRole("link", { name: "Ada Lovelace" })).toHaveAttribute("href", "/mentors/profile-1");
  });

  it.each([{ area: "golang" }, { area: ["react", "python"] }])(
    "answers an unknown or repeated area with a recovery link and no query: %j",
    async (searchParams) => {
      render(await page(searchParams));
      expect(listBookable).not.toHaveBeenCalled();
      expect(screen.getByRole("status")).toHaveTextContent("Unknown area");
      expect(screen.getByRole("link", { name: "All mentors" })).toHaveAttribute("href", "/mentors");
      expect(screen.queryByRole("list", { name: "Mentors" })).not.toBeInTheDocument();
      // Nothing from the database is echoed back, and no filter looks selected.
      expect(screen.queryByRole("link", { current: "page" })).not.toBeInTheDocument();
    }
  );

  it("shows a plain empty state for an area with no bookable mentors, plus a way back to all", async () => {
    listBookable.mockResolvedValue([]);
    render(await page({ area: "python" }));
    expect(screen.getByText("No Python mentors are taking bookings yet.")).toBeVisible();
    expect(screen.getByRole("link", { name: "All mentors" })).toHaveAttribute("href", "/mentors");
    expect(screen.queryByRole("list", { name: "Mentors" })).not.toBeInTheDocument();
  });

  it("shows an empty listing as a valid state when no mentor is bookable at all", async () => {
    listBookable.mockResolvedValue([]);
    render(await page());
    expect(screen.getByText("No mentors are taking bookings yet.")).toBeVisible();
    // Already on All mentors, so the filter itself is the way to every area.
    expect(screen.queryByRole("link", { name: "All mentors" })).not.toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Area" })).toBeVisible();
  });

  it("lists a ready mentor whose excerpt is all the listing knows, with no availability signal", async () => {
    // listBookable is slot-independent, so a bookable mentor with no slots arrives like any other.
    listBookable.mockResolvedValue([ada]);
    const { container } = render(await page());
    expect(screen.getByRole("link", { name: "Ada Lovelace" })).toBeVisible();
    expect(container.textContent).not.toMatch(/slot|time|book now/i);
  });
});
