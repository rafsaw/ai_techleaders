import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ApiResult } from "../../api/types";
import { SlotList } from "../availability/SlotList";
import { BOOKED_SENTENCE, SlotRow } from "../availability/SlotRow";
import { payoutHasAction, PayoutStatus, type PayoutSetup } from "../payments/PayoutStatus";
import { BookableStatusLine, bookableSentence } from "./BookableStatusLine";
import { firstWithAction, SetupChecklist } from "./SetupChecklist";

const fail = (code: string, message: string): ApiResult<never> => ({ ok: false, error: { code, message } });

describe("BookableStatusLine", () => {
  it("says one of the four sentences and names only the missing items", () => {
    expect(bookableSentence({ status: "phase-1" })).toBe("Not bookable yet.");
    expect(bookableSentence({ status: "no-slots" })).toBe("You are bookable, but you have no upcoming slots, so mentees have nothing to pick.");
    expect(bookableSentence({ status: "not-bookable", missing: ["profile", "stripe"] })).toBe("Not bookable yet: finish your profile and Stripe.");
    expect(bookableSentence({ status: "not-bookable", missing: ["stripe"] })).toBe("Not bookable yet: finish Stripe.");
    render(<BookableStatusLine state={{ status: "not-bookable", missing: ["profile"] }} />);
    expect(screen.getByText("Not bookable yet: finish your profile.")).toBeVisible();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("copies the public link when bookable and reports success or failure", async () => {
    const copy = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("denied"));
    render(<BookableStatusLine state={{ status: "bookable", publicUrl: "https://devmentor.example/mentors/1" }} copy={copy} />);
    expect(screen.getByText("You are bookable.")).toBeVisible();
    expect(screen.getByRole("link", { name: "https://devmentor.example/mentors/1" })).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("");
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Copied."));
    expect(copy).toHaveBeenCalledWith("https://devmentor.example/mentors/1");
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Could not copy."));
  });

  it("uses the clipboard by default", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<BookableStatusLine state={{ status: "bookable", publicUrl: "https://devmentor.example/mentors/1" }} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("https://devmentor.example/mentors/1"));
  });
});

describe("SetupChecklist", () => {
  it("renders the profile and slots items with their state in words and one action", () => {
    const { rerender } = render(<SetupChecklist profile={{ status: "not-started", createHref: "/mentor/profile" }} />);
    const list = screen.getByRole("list", { name: "Mentor setup" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 2, name: "Profile" })).toBeVisible();
    expect(screen.getByText("Not started")).toBeVisible();
    expect(screen.getByRole("link", { name: "Create your profile" })).toHaveAttribute("href", "/mentor/profile");

    rerender(
      <SetupChecklist
        profile={{ status: "saved", editHref: "/mentor/profile", publicHref: "/mentors/1" }}
        payouts={{ payout: { status: "ready" }, startOnboarding: vi.fn(), onOnboardingUrl: vi.fn(), contactHref: "mailto:team@devmentor.example" }}
        slots={{ status: "locked" }}
      />
    );
    expect(screen.getByText("Saved")).toHaveAttribute("data-slot", "badge");
    expect(screen.getByRole("link", { name: "View public page" })).toHaveAttribute("href", "/mentors/1");
    expect(screen.getByRole("heading", { level: 2, name: "Payouts with Stripe" })).toBeVisible();
    expect(screen.getByText("Save your profile first.")).toBeVisible();

    rerender(<SetupChecklist profile={{ status: "saved", editHref: "/e", publicHref: "/p" }} slots={{ status: "none", manageHref: "/mentor/slots" }} />);
    expect(screen.getByText("No upcoming slots")).toBeVisible();
    expect(screen.getByRole("link", { name: "Publish slots" })).toHaveAttribute("href", "/mentor/slots");

    rerender(<SetupChecklist profile={{ status: "saved", editHref: "/e", publicHref: "/p" }} slots={{ status: "some", upcoming: 3, booked: 1, manageHref: "/mentor/slots" }} />);
    expect(screen.getByText("3 upcoming (1 booked)")).toBeVisible();
    expect(screen.getByRole("link", { name: "Manage slots" })).toBeVisible();
  });

  it("gives the one primary button to the first unfinished item with an action (R01.6, Q-SC1)", () => {
    const saved = { status: "saved", editHref: "/e", publicHref: "/p" } as const;
    const payouts = (payout: PayoutSetup) => ({ payout, startOnboarding: vi.fn(), onOnboardingUrl: vi.fn(), contactHref: "mailto:team@devmentor.example" });
    const none = { status: "none", manageHref: "/mentor/slots" } as const;
    const some = { status: "some", upcoming: 1, booked: 0, manageHref: "/s" } as const;
    const primary = () => [...document.querySelectorAll("a, button")].filter((element) => element.classList.contains("bg-primary"));

    const { rerender } = render(<SetupChecklist profile={saved} payouts={payouts({ status: "incomplete" })} slots={none} />);
    expect(primary().map((element) => element.textContent)).toEqual(["Continue with Stripe"]);
    expect(screen.getByRole("link", { name: "Publish slots" })).toHaveClass("border-input");

    // Waiting for Stripe: payouts has no action, so Publish slots takes the primary style.
    rerender(<SetupChecklist profile={saved} payouts={payouts({ status: "pending", checkStatusHref: "/r" })} slots={none} />);
    expect(primary().map((element) => element.textContent)).toEqual(["Publish slots"]);
    expect(screen.getByRole("link", { name: "Check status" })).not.toHaveClass("bg-primary");

    // Setup failed or Blocked: the action is Contact the DevMentor team, and it is the primary.
    for (const status of ["failed", "blocked"] as const) {
      rerender(<SetupChecklist profile={saved} payouts={payouts({ status })} slots={none} />);
      const contact = screen.getByRole("link", { name: "Contact the DevMentor team" });
      expect(primary()).toEqual([contact]);
      expect(contact).toHaveAttribute("href", "mailto:team@devmentor.example");
      expect(screen.getByRole("link", { name: "Publish slots" })).toHaveClass("border-input");
    }

    // No item has an action: no primary button.
    rerender(<SetupChecklist profile={saved} payouts={payouts({ status: "pending", checkStatusHref: "/r" })} slots={some} />);
    expect(primary()).toHaveLength(0);

    expect(firstWithAction({ profile: { status: "not-started", createHref: "/c" }, payouts: payouts({ status: "locked" }), slots: { status: "locked" } })).toBe("profile");
    expect(firstWithAction({ profile: saved, payouts: payouts({ status: "no-row", countries: [] }), slots: none })).toBe("payouts");
    expect(firstWithAction({ profile: saved, payouts: payouts({ status: "pending", checkStatusHref: "/r" }), slots: none })).toBe("slots");
    expect(firstWithAction({ profile: saved, payouts: payouts({ status: "blocked" }), slots: none })).toBe("payouts");
    expect(firstWithAction({ profile: saved, payouts: payouts({ status: "ready" }), slots: none })).toBe("slots");
    expect(firstWithAction({ profile: saved, slots: none })).toBe("slots");
    expect(firstWithAction({ profile: saved, payouts: payouts({ status: "ready" }), slots: some })).toBeUndefined();
    expect(firstWithAction({ profile: saved })).toBeUndefined();
  });

  it("knows which payout statuses have an action to take", () => {
    expect((["no-row", "provisioning-pending", "reconciliation-required", "incomplete"] as const).every((status) =>
      payoutHasAction(status === "no-row" ? { status, countries: [] } : { status }))).toBe(true);
    expect(payoutHasAction({ status: "pending", checkStatusHref: "/r" })).toBe(false);
    expect(payoutHasAction({ status: "blocked" })).toBe(true);
    expect(payoutHasAction({ status: "failed" })).toBe(true);
    expect(payoutHasAction({ status: "ready" })).toBe(false);
    expect(payoutHasAction({ status: "locked" })).toBe(false);
  });

  it("renders the payout setup button in outline when it does not hold the primary action", () => {
    render(<PayoutStatus payout={{ status: "incomplete" }} startOnboarding={vi.fn()} onOnboardingUrl={vi.fn()} contactHref="mailto:x" next={false} />);
    expect(screen.getByRole("button", { name: "Continue with Stripe" })).not.toHaveClass("bg-primary");
    render(<PayoutStatus payout={{ status: "blocked" }} startOnboarding={vi.fn()} onOnboardingUrl={vi.fn()} contactHref="mailto:x" next={false} />);
    expect(screen.getByRole("link", { name: "Contact the DevMentor team" })).toHaveClass("border-input");
  });
});

describe("PayoutStatus", () => {
  const props = { startOnboarding: vi.fn(), onOnboardingUrl: vi.fn(), contactHref: "mailto:team@devmentor.example" };

  it.each([
    [{ status: "locked" }, "Locked", null],
    [{ status: "provisioning-pending" }, "Starting Stripe setup", "Retry setup"],
    [{ status: "reconciliation-required" }, "Setup interrupted", "Retry setup"],
    [{ status: "failed" }, "Setup failed", "Contact the DevMentor team"],
    [{ status: "incomplete" }, "Incomplete", "Continue with Stripe"],
    [{ status: "pending", checkStatusHref: "/api/payments/onboarding/return" }, "Pending", "Check status"],
    [{ status: "blocked" }, "Blocked", "Contact the DevMentor team"],
    [{ status: "ready" }, "Confirmed", null],
  ] as [PayoutSetup, string, string | null][])("shows %o as text with its one action", (payout, state, action) => {
    render(<PayoutStatus payout={payout} {...props} />);
    expect(screen.getByText(state)).toHaveAttribute("data-slot", "badge");
    if (action) expect(screen.getByRole(/Retry|Continue with/.test(action) ? "button" : "link", { name: action })).toBeVisible();
    else {
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
    }
  });

  it("keeps badges short and shows the spec's full state as the note", () => {
    const { rerender } = render(<PayoutStatus payout={{ status: "reconciliation-required" }} {...props} />);
    expect(screen.getByText("We need to check an earlier setup attempt.")).toHaveAttribute("data-slot", "card-description");
    rerender(<PayoutStatus payout={{ status: "pending", checkStatusHref: "/r" }} {...props} />);
    expect(screen.getByText("Stripe is checking your details.")).toHaveAttribute("data-slot", "card-description");
    rerender(<PayoutStatus payout={{ status: "ready" }} {...props} />);
    expect(document.querySelector("[data-slot=card-description]")).toBeNull();
  });

  it("asks for a country before the first POST and follows the Stripe link", async () => {
    const startOnboarding = vi.fn()
      .mockResolvedValueOnce(fail("conflict", "Stripe onboarding is already starting. Try again in a moment"))
      .mockResolvedValueOnce({ ok: true, data: { url: "https://connect.stripe.com/setup/x" } });
    const onOnboardingUrl = vi.fn();
    render(
      <PayoutStatus
        payout={{ status: "no-row", countries: [{ code: "PL", name: "Poland" }, { code: "CA", name: "Canada" }] }}
        startOnboarding={startOnboarding}
        onOnboardingUrl={onOnboardingUrl}
        contactHref="mailto:x"
      />
    );
    const select = screen.getByRole("combobox", { name: "Country" });
    expect(Array.from((select as HTMLSelectElement).options).map((option) => option.text)).toEqual(["Choose a country", "Canada", "Poland"]);
    expect(select).toHaveAccessibleDescription(/You can't change this Stripe account's country later/);
    fireEvent.click(screen.getByRole("button", { name: "Continue to Stripe" }));
    expect(screen.getByText("Choose a country.")).toBeVisible();
    expect(select).toHaveAttribute("aria-invalid", "true");
    expect(startOnboarding).not.toHaveBeenCalled();

    fireEvent.change(select, { target: { value: "PL" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue to Stripe" }));
    expect(screen.getByRole("button", { name: "Starting Stripe setup…" })).toBeDisabled();
    expect(await screen.findByRole("alert")).toHaveTextContent("Stripe onboarding is already starting.");
    expect(startOnboarding).toHaveBeenCalledWith({ country: "PL" });
    expect(select).not.toHaveAttribute("aria-invalid");

    fireEvent.click(screen.getByRole("button", { name: "Continue to Stripe" }));
    await waitFor(() => expect(onOnboardingUrl).toHaveBeenCalledWith("https://connect.stripe.com/setup/x"));
  });

  it("retries or continues without a country", async () => {
    const startOnboarding = vi.fn().mockResolvedValue({ ok: true, data: { url: "https://connect.stripe.com/setup/y" } });
    render(<PayoutStatus payout={{ status: "incomplete" }} startOnboarding={startOnboarding} onOnboardingUrl={vi.fn()} contactHref="mailto:x" />);
    fireEvent.click(screen.getByRole("button", { name: "Continue with Stripe" }));
    await waitFor(() => expect(startOnboarding).toHaveBeenCalledWith({}));
  });
});

describe("SlotList and SlotRow", () => {
  it("shows loading, error, empty and rows", () => {
    const onRetry = vi.fn();
    const { rerender } = render(<SlotList count={0} loading />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading upcoming slots");
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    rerender(<SlotList count={0} error="Could not reach the server." onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't load your slots");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledOnce();
    rerender(<SlotList count={0} />);
    expect(screen.getByText("No upcoming slots")).toBeVisible();
    rerender(
      <SlotList count={2}>
        <SlotRow timeZone="Europe/Warsaw" booked={false} remove={vi.fn()}>Wed, 4 Nov, 18:30</SlotRow>
        <SlotRow timeZone="Europe/Warsaw" booked>Thu, 5 Nov, 09:00</SlotRow>
      </SlotList>
    );
    expect(screen.getByRole("heading", { level: 2, name: "Upcoming slots" })).toBeVisible();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("Open")).toBeVisible();
    expect(screen.getByText("Booked")).toBeVisible();
    expect(screen.getByText(BOOKED_SENTENCE)).toBeVisible();
    expect(screen.getAllByRole("button", { name: "Remove" })).toHaveLength(1);
  });

  it("removes an open slot after confirmation and explains a slot booked meanwhile", async () => {
    const remove = vi.fn()
      .mockResolvedValueOnce(fail("conflict", BOOKED_SENTENCE))
      .mockResolvedValueOnce({ ok: true, data: {} });
    render(<ul><SlotRow timeZone="Europe/Warsaw" booked={false} remove={remove}>Wed, 4 Nov, 18:30</SlotRow></ul>);
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveAccessibleName("Remove the slot on Wed, 4 Nov, 18:30?");
    fireEvent.click(within(dialog).getByRole("button", { name: "Remove slot" }));
    expect(await within(dialog).findByText(BOOKED_SENTENCE)).toBeVisible();
    expect(within(dialog).queryByRole("button", { name: "Remove slot" })).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    const again = await screen.findByRole("alertdialog");
    expect(within(again).getByRole("button", { name: "Cancel" })).toBeVisible();
    fireEvent.click(within(again).getByRole("button", { name: "Remove slot" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(remove).toHaveBeenCalledTimes(2);
  });

  it("keeps Remove slot for a retry after a network or server error, and Close only for a removed slot", async () => {
    const remove = vi.fn()
      .mockResolvedValueOnce(fail("network_error", "Could not reach the server. Check your connection and try again."))
      .mockResolvedValueOnce(fail("not_found", "This slot no longer exists."));
    render(<ul><SlotRow timeZone="Europe/Warsaw" booked={false} remove={remove}>Wed, 4 Nov, 18:30</SlotRow></ul>);
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Remove slot" }));
    expect(await within(dialog).findByText(/Could not reach the server/)).toBeVisible();
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toBeVisible();
    fireEvent.click(within(dialog).getByRole("button", { name: "Remove slot" }));
    expect(await within(dialog).findByText("This slot no longer exists.")).toBeVisible();
    expect(within(dialog).getByRole("button", { name: "Close" })).toBeVisible();
    expect(within(dialog).queryByRole("button", { name: "Remove slot" })).not.toBeInTheDocument();
  });

  it("shows no Remove on an open row without a remove call", () => {
    render(<ul><SlotRow timeZone="Europe/Warsaw" booked={false}>Wed, 4 Nov, 18:30</SlotRow></ul>);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
