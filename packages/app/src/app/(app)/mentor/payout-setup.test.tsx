import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { apiCall } from "@devmentor/ui/api/apiCall";
import { beforeEach, describe, expect, it, vi } from "vitest";

import MentorSetupPage from "@/app/(app)/mentor/page";
import { PayoutSetupChecklist, payoutSetup } from "@/app/(app)/mentor/payout-setup";

const { refresh, getSetup } = vi.hoisted(() => ({ refresh: vi.fn(), getSetup: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@devmentor/ui/api/apiCall", () => ({ apiCall: vi.fn() }));
vi.mock("@/server/auth/page-guards", () => ({ requireRole: vi.fn(async () => ({ userId: "u", roles: ["mentor"] })) }));
vi.mock("@/server/container", () => ({ createRequestScope: () => ({ cradle: { mentorProfileService: { getSetup } } }) }));

const saved = { status: "saved", editHref: "/mentor/profile", publicHref: "/mentors/1" } as const;
const pending = { country: "PL", provisioningState: "pending", status: "incomplete" } as const;

beforeEach(() => { vi.mocked(apiCall).mockReset(); refresh.mockReset(); });

describe("payout setup", () => {
  it("maps every provisioning state ahead of payout status", () => {
    expect(payoutSetup({ status: "not-started", createHref: "/mentor/profile" }, pending).status).toBe("locked");
    expect(payoutSetup(saved, { country: null, provisioningState: null, status: "not_started" }).status).toBe("no-row");
    expect(payoutSetup(saved, pending).status).toBe("provisioning-pending");
    expect(payoutSetup(saved, { ...pending, provisioningState: "reconciliation_required" }).status).toBe("reconciliation-required");
    expect(payoutSetup(saved, { ...pending, provisioningState: "failed" }).status).toBe("failed");
    for (const status of ["pending", "ready", "blocked", "incomplete", "not_started"] as const) {
      expect(payoutSetup(saved, { ...pending, provisioningState: "provisioned", status }).status).toBe(status === "not_started" ? "incomplete" : status);
    }
  });

  it("posts the selected country and preserves errors while refreshing setup", async () => {
    vi.mocked(apiCall).mockResolvedValue({ ok: false, error: { code: "provider_unavailable", message: "Try again" } });
    const { rerender } = render(<PayoutSetupChecklist profile={saved} payout={{ country: null, provisioningState: null, status: "not_started" }} />);
    fireEvent.change(screen.getByRole("combobox", { name: "Country" }), { target: { value: "PL" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue to Stripe" }));
    await waitFor(() => expect(apiCall).toHaveBeenCalledWith("/api/payments/onboarding", { method: "POST", body: { country: "PL" } }));
    expect(screen.getByRole("alert")).toHaveTextContent("Try again");
    expect(refresh).toHaveBeenCalled();
    rerender(<PayoutSetupChecklist profile={saved} payout={{ ...pending, provisioningState: "provisioned" }} />);
    expect(screen.getByText("Country: Poland")).toBeVisible();
    expect(screen.getByRole("link", { name: "Check status" })).toHaveAttribute("href", "/api/payments/onboarding/return");
    fireEvent.click(screen.getByRole("button", { name: "Continue with Stripe" }));
    await waitFor(() => expect(apiCall).toHaveBeenLastCalledWith("/api/payments/onboarding", { method: "POST", body: { country: "PL" } }));
  });

  it("follows the returned Stripe URL only on a successful POST", async () => {
    vi.mocked(apiCall).mockResolvedValue({ ok: true, data: { url: "#stripe-success" } });
    render(<PayoutSetupChecklist profile={saved} payout={pending} />);
    fireEvent.click(screen.getByRole("button", { name: "Retry setup" }));
    await waitFor(() => expect(window.location.hash).toBe("#stripe-success"));
    expect(refresh).not.toHaveBeenCalled();
    window.location.hash = "";
  });

  it("retries with the stored country and displays contact guidance without an invented address", async () => {
    vi.mocked(apiCall).mockResolvedValue({ ok: false, error: { code: "conflict", message: "Wait" } });
    const { rerender } = render(<PayoutSetupChecklist profile={saved} payout={pending} />);
    fireEvent.click(screen.getByRole("button", { name: "Retry setup" }));
    await waitFor(() => expect(apiCall).toHaveBeenCalledWith("/api/payments/onboarding", { method: "POST", body: { country: "PL" } }));
    rerender(<PayoutSetupChecklist profile={saved} payout={{ ...pending, provisioningState: "failed" }} />);
    expect(screen.getByText("Contact the DevMentor team.")).toBeVisible();
    expect(screen.queryByRole("link", { name: "Contact the DevMentor team" })).not.toBeInTheDocument();
  });

  it("renders the correct bookability and check-failure message without a stale checking banner", async () => {
    getSetup.mockResolvedValue({ profile: { id: "1" }, publicUrl: "/mentors/1", bookable: true, payout: { ...pending, provisioningState: "provisioned", status: "ready" } });
    const { unmount } = render(await MentorSetupPage({ searchParams: Promise.resolve({ stripe: "returned" }) }));
    expect(screen.getByText("You are bookable.")).toBeVisible();
    expect(screen.queryByText(/Stripe is checking your details/)).not.toBeInTheDocument();
    unmount();
    render(await MentorSetupPage({ searchParams: Promise.resolve({ stripe: "check_failed" }) }));
    expect(screen.getByRole("link", { name: "Try checking again" })).toHaveAttribute("href", "/api/payments/onboarding/return");
  });
});
