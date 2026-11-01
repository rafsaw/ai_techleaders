import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NotFoundError } from "@devmentor/core";

import PublicMentorProfilePage, { metadata } from "@/app/(frontend)/mentors/[id]/page";
import { getPrincipal } from "@/server/auth/page-guards";

const { connection, getPublic, notFound } = vi.hoisted(() => ({
  connection: vi.fn(),
  getPublic: vi.fn(),
  notFound: vi.fn(() => { throw new Error("next:not-found"); }),
}));
vi.mock("next/server", () => ({ connection }));
vi.mock("next/navigation", () => ({ notFound }));
vi.mock("@/server/auth/page-guards", () => ({ getPrincipal: vi.fn() }));
vi.mock("@/server/container", () => ({
  createRequestScope: () => ({ cradle: { mentorProfileService: { getPublic } } }),
}));

const profile = {
  id: "profile-id",
  displayName: "Ada Lovelace",
  area: "typescript" as const,
  description: "TypeScript systems\nPlain text only.",
  publicWorkLinks: ["https://github.com/ada/project"],
  prices: {
    25: { amountMinor: 4_000, currency: "USD" as const },
    50: { amountMinor: 7_050, currency: "USD" as const },
  },
  bookable: false,
};

function page(id = "profile-id") {
  return PublicMentorProfilePage({ params: Promise.resolve({ id }), searchParams: Promise.resolve({}) });
}

beforeEach(() => {
  connection.mockReset().mockResolvedValue(undefined);
  getPublic.mockReset().mockResolvedValue(profile);
  notFound.mockClear();
  vi.mocked(getPrincipal).mockReset().mockResolvedValue(null);
});

describe("/mentors/[id]", () => {
  it("renders at request time with public work, both prices, and no ratings or reviews", async () => {
    const { container } = render(await page());
    expect(connection).toHaveBeenCalledOnce();
    expect(getPrincipal).toHaveBeenCalledOnce();
    expect(getPublic).toHaveBeenCalledWith("profile-id");
    expect(metadata.title).toBe("Mentor profile");
    expect(screen.getByRole("heading", { level: 1, name: "Ada Lovelace" })).toBeVisible();
    expect(screen.getByText(/TypeScript systems/)).toBeVisible();
    expect(screen.getByRole("link", { name: /github\.com\/ada\/project/ })).toHaveAttribute("rel", "nofollow noopener ugc");
    expect(screen.getByRole("list", { name: "Prices" })).toHaveTextContent("25 min · $40");
    expect(screen.getByRole("list", { name: "Prices" })).toHaveTextContent("50 min · $70.50");
    expect(screen.getByText("Text sessions only")).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("Not taking bookings yet");
    expect(container.textContent).not.toMatch(/rating|review/i);
  });

  it("omits the not-bookable notice once a later phase makes the profile bookable", async () => {
    getPublic.mockResolvedValue({ ...profile, bookable: true });
    render(await page());
    expect(screen.queryByText("Not taking bookings yet")).not.toBeInTheDocument();
  });

  it("maps a service 404 to the neutral Next not-found boundary", async () => {
    getPublic.mockRejectedValue(new NotFoundError("Mentor profile not found"));
    await expect(page("missing")).rejects.toThrow("next:not-found");
    expect(notFound).toHaveBeenCalledOnce();
  });

  it("preserves unexpected failures", async () => {
    const failure = new Error("database unavailable");
    getPublic.mockRejectedValue(failure);
    await expect(page()).rejects.toBe(failure);
    expect(notFound).not.toHaveBeenCalled();
  });
});
