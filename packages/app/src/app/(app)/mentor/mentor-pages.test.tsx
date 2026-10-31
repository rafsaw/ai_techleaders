import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Principal } from "@devmentor/core";
import { apiCall } from "@devmentor/ui/api/apiCall";

import MentorSetupPage, { metadata as setupMetadata } from "@/app/(app)/mentor/page";
import { MentorProfileForm } from "@/app/(app)/mentor/profile/mentor-profile-form";
import MentorProfilePage, { metadata as profileMetadata } from "@/app/(app)/mentor/profile/page";
import { navigateFully } from "@/app/full-navigation";
import { requireRole } from "@/server/auth/page-guards";

const { getOwn, getSetup } = vi.hoisted(() => ({ getOwn: vi.fn(), getSetup: vi.fn() }));
vi.mock("@/server/auth/page-guards", () => ({ requireRole: vi.fn() }));
vi.mock("@/server/container", () => ({
  createRequestScope: () => ({ cradle: { mentorProfileService: { getOwn, getSetup } } }),
}));
vi.mock("@devmentor/ui/api/apiCall", () => ({ apiCall: vi.fn() }));
vi.mock("@/app/full-navigation", () => ({ navigateFully: vi.fn() }));

const principal: Principal = { userId: "mentor-id", sessionId: "session-id", displayName: "Ada", roles: ["mentor"] };
const profile = {
  id: "profile-id",
  area: "typescript" as const,
  description: "TypeScript systems",
  publicWorkLinks: ["https://github.com/ada/project"],
  prices: {
    25: { amountMinor: 4_000, currency: "USD" as const },
    50: { amountMinor: 7_000, currency: "USD" as const },
  },
};

beforeEach(() => {
  vi.mocked(requireRole).mockReset().mockResolvedValue(principal);
  getOwn.mockReset().mockResolvedValue(null);
  getSetup.mockReset().mockResolvedValue({ profile: null, publicUrl: null, bookable: false });
  vi.mocked(apiCall).mockReset();
  vi.mocked(navigateFully).mockReset();
});

describe("/mentor", () => {
  it("guards the page and shows only the Phase 1 profile step before setup starts", async () => {
    render(await MentorSetupPage());
    expect(requireRole).toHaveBeenCalledWith("mentor", { returnTo: "/mentor" });
    expect(getSetup).toHaveBeenCalledWith(principal);
    expect(setupMetadata.title).toBe("Mentor setup");
    expect(screen.getByRole("heading", { level: 1, name: "Mentor setup" })).toBeVisible();
    expect(screen.getByText("Not bookable yet.")).toBeVisible();
    expect(screen.getByText("Not started")).toBeVisible();
    expect(screen.getByRole("link", { name: "Create your profile" })).toHaveAttribute("href", "/mentor/profile");
    expect(screen.queryByText("Payouts with Stripe")).not.toBeInTheDocument();
    expect(screen.queryByText("Slots")).not.toBeInTheDocument();
  });

  it("shows edit and public-page links after the profile is saved", async () => {
    getSetup.mockResolvedValue({ profile, publicUrl: "/mentors/profile-id", bookable: false });
    render(await MentorSetupPage());
    expect(screen.getByText("Saved")).toBeVisible();
    expect(screen.getByRole("link", { name: "Edit profile" })).toHaveAttribute("href", "/mentor/profile");
    expect(screen.getByRole("link", { name: "View public page" })).toHaveAttribute("href", "/mentors/profile-id");
  });
});

describe("/mentor/profile", () => {
  it("renders an empty create form and guards with the exact return path", async () => {
    render(await MentorProfilePage());
    expect(requireRole).toHaveBeenCalledWith("mentor", { returnTo: "/mentor/profile" });
    expect(getOwn).toHaveBeenCalledWith(principal);
    expect(profileMetadata.title).toBe("Mentor profile");
    expect(screen.getByRole("heading", { level: 1, name: "Create your profile" })).toBeVisible();
    expect(screen.getByRole("combobox", { name: "Area" })).toHaveValue("");
    expect(screen.getByRole("textbox", { name: "Links to public work" }).tagName).toBe("TEXTAREA");
  });

  it("prefills the edit form from stored minor units", async () => {
    getOwn.mockResolvedValue(profile);
    render(await MentorProfilePage());
    expect(screen.getByRole("heading", { level: 1, name: "Edit profile" })).toBeVisible();
    expect(screen.getByRole("combobox", { name: "Area" })).toHaveValue("typescript");
    expect(screen.getByRole("textbox", { name: "Description" })).toHaveValue("TypeScript systems");
    expect(screen.getByRole("spinbutton", { name: "Price for 25 minutes (USD)" })).toHaveValue(40);
    expect(screen.getByRole("spinbutton", { name: "Price for 50 minutes (USD)" })).toHaveValue(70);
  });

  it("saves the shared schema output and fully navigates to setup", async () => {
    vi.mocked(apiCall).mockResolvedValue({ ok: true, data: profile });
    render(<MentorProfileForm profile={profile} />);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(apiCall).toHaveBeenCalledWith("/api/mentors/profile", {
      method: "PUT",
      body: {
        area: "typescript",
        description: "TypeScript systems",
        publicWorkLinks: ["https://github.com/ada/project"],
        price25Dollars: 40,
        price50Dollars: 70,
      },
    }));
    expect(navigateFully).toHaveBeenCalledWith("/mentor");
  });

  it("shows approved validation copy without calling the API", async () => {
    render(<MentorProfileForm profile={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect((await screen.findAllByText("Choose an area")).at(-1)).toBeVisible();
    expect(screen.getByText("Describe what you help with")).toBeVisible();
    expect(screen.getByText("Add at least one link")).toBeVisible();
    expect(apiCall).not.toHaveBeenCalled();
  });
});
