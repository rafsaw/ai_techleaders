import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiCall } from "@devmentor/ui/api/apiCall";
import { requireRole } from "@/server/auth/page-guards";
import { LocalTime } from "./local-time";
import Page, { metadata } from "./page";
import { SlotManager } from "./slot-manager";
import { isExistingLocalTime } from "./slot-form";

const { listUpcoming } = vi.hoisted(() => ({ listUpcoming: vi.fn() }));
vi.mock("@/server/auth/page-guards", () => ({ requireRole: vi.fn() }));
vi.mock("@/server/container", () => ({ createRequestScope: () => ({ cradle: { slotService: { listUpcoming } } }) }));
vi.mock("@devmentor/ui/api/apiCall", () => ({ apiCall: vi.fn() }));
const first = { id: "a", startsAt: "2030-01-01T12:00:00.000Z", booked: false };
const booked = { id: "b", startsAt: "2030-01-02T12:00:00.000Z", booked: true };
beforeEach(() => { vi.clearAllMocks(); });

describe("mentor slots", () => {
  it("rejects invalid local values before converting them", () => {
    expect(isExistingLocalTime("")).toBe(true);
    expect(isExistingLocalTime("invalid")).toBe(false);
  });
  it("rejects a nonexistent local time at the spring clock change", async () => {
    const oldZone = process.env.TZ;
    process.env.TZ = "America/New_York";
    try {
      render(<SlotManager initialSlots={[]} />);
      fireEvent.change(screen.getByLabelText(/Start time/), { target: { value: "2030-03-10T02:30" } });
      fireEvent.click(screen.getByRole("button", { name: "Publish slot" }));
      expect(await screen.findByText("This time does not exist in your time zone. Choose another time.")).toBeVisible();
      expect(apiCall).not.toHaveBeenCalled();
    } finally {
      if (oldZone === undefined) delete process.env.TZ;
      else process.env.TZ = oldZone;
    }
  });
  it("guards and loads the server page", async () => {
    vi.mocked(requireRole).mockResolvedValue({ userId: "u", sessionId: "s", displayName: "A", roles: ["mentor"] });
    listUpcoming.mockResolvedValue([first, booked]);
    render(await Page());
    expect(metadata.title).toBe("Manage slots");
    expect(requireRole).toHaveBeenCalledWith("mentor", { returnTo: "/mentor/slots" });
    expect(listUpcoming).toHaveBeenCalledWith(expect.objectContaining({ userId: "u" }));
    expect(screen.getByText("Open")).toBeVisible();
    expect(screen.getByText("Booked")).toBeVisible();
    expect(screen.getByText(/This slot is booked/)).toBeVisible();
  });
  it("renders an ISO instant on the server and local time after hydration", () => {
    expect(renderToString(<LocalTime instant={first.startsAt} />)).toContain(first.startsAt);
    expect(renderToString(<SlotManager initialSlots={[]} />)).toContain("your local time");
    render(<LocalTime instant={first.startsAt} />);
    expect(screen.getByText(new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(first.startsAt)))).toHaveAttribute("datetime", first.startsAt);
  });
  it("validates, publishes, retains the value and orders slots", async () => {
    render(<SlotManager initialSlots={[booked]} />);
    fireEvent.click(screen.getByRole("button", { name: "Publish slot" }));
    expect(await screen.findByText("Choose a start time")).toBeVisible();
    const input = screen.getByLabelText(/Start time/);
    fireEvent.change(input, { target: { value: "2030-01-01T12:00" } });
    fireEvent.blur(input);
    vi.mocked(apiCall).mockResolvedValueOnce({ ok: true, data: first });
    fireEvent.click(screen.getByRole("button", { name: "Publish slot" }));
    await waitFor(() => expect(apiCall).toHaveBeenCalledWith("/api/availability/slots", expect.objectContaining({ method: "POST", body: { startsAt: new Date("2030-01-01T12:00").toISOString() }, signal: expect.any(AbortSignal) })));
    expect(input).toHaveValue("2030-01-01T12:00");
    expect(within(screen.getByRole("list", { name: "" })).getAllByRole("listitem")[0]).toHaveTextContent("Open");
  });
  it("shows server field and conflict errors", async () => {
    render(<SlotManager initialSlots={[]} />);
    expect(screen.getByText("No upcoming slots")).toBeVisible();
    fireEvent.change(screen.getByLabelText(/Start time/), { target: { value: "2030-01-01T12:00" } });
    vi.mocked(apiCall).mockResolvedValueOnce({ ok: false, error: { code: "validation", message: "Invalid", fieldErrors: { startsAt: ["Too soon"] } } }).mockResolvedValueOnce({ ok: false, error: { code: "conflict", message: "Overlaps slot" } });
    fireEvent.click(screen.getByRole("button", { name: "Publish slot" }));
    expect(await screen.findByText("Too soon")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Publish slot" }));
    expect(await screen.findByText("Overlaps slot")).toBeVisible();
  });
  it("removes an open slot only after confirmation and keeps failures visible", async () => {
    render(<SlotManager initialSlots={[first]} />);
    vi.mocked(apiCall).mockResolvedValueOnce({ ok: false, error: { code: "conflict", message: "Already booked" } }).mockResolvedValueOnce({ ok: true, data: { id: "a" } });
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove slot" }));
    expect(await screen.findByText("Already booked")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove slot" }));
    expect(await screen.findByText("No upcoming slots")).toBeVisible();
    expect(apiCall).toHaveBeenCalledWith("/api/availability/slots?id=a", { method: "DELETE" });
  });
});
