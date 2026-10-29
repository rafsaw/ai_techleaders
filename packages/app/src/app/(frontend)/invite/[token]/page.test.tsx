import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Principal } from "@devmentor/core";
import { apiCall } from "@devmentor/ui/api/apiCall";
import type { ApiResult } from "@devmentor/ui/api/types";

import { INVITATION_ACCEPTED_DESTINATION } from "@/app/(frontend)/auth-links";
import { AppInvitationPanel } from "@/app/(frontend)/invite/[token]/invitation-panel";
import InvitationPage, { metadata } from "@/app/(frontend)/invite/[token]/page";
import { navigateFully } from "@/app/full-navigation";
import { getPrincipal } from "@/server/auth/page-guards";

const { inspect } = vi.hoisted(() => ({ inspect: vi.fn() }));
vi.mock("@/server/auth/page-guards", () => ({ getPrincipal: vi.fn() }));
vi.mock("@/server/container", () => ({ createRequestScope: () => ({ cradle: { mentorInvitationService: { inspect } } }) }));
vi.mock("@devmentor/ui/api/apiCall", () => ({ apiCall: vi.fn() }));
vi.mock("@/app/full-navigation", () => ({ navigateFully: vi.fn() }));

const TOKEN = "Abc_DEF-0123456789abcdefghijklmnopqrstuvwxy";
const ENCODED_PATH = `%2Finvite%2F${TOKEN}`;
const ada: Principal = { userId: "user-1", sessionId: "session-1", displayName: "Ada Nowak", roles: ["mentee"] };
const fail = (code: string, message: string): ApiResult<never> => ({ ok: false, error: { code, message } });
const page = (token = TOKEN) => InvitationPage({ params: Promise.resolve({ token }) });

beforeEach(() => {
  vi.mocked(getPrincipal).mockReset().mockResolvedValue(ada);
  vi.mocked(apiCall).mockReset();
  vi.mocked(navigateFully).mockReset();
  inspect.mockReset();
});

describe("/invite/[token]", () => {
  it("never leaks the token as a referrer and is never indexed", () => {
    expect(metadata).toEqual({ title: "Mentor invitation", referrer: "no-referrer", robots: { index: false, follow: false } });
  });

  it("only inspects, with the visitor's principal, and shows one message for any unusable link", async () => {
    inspect.mockResolvedValue({ status: "invalid" });
    const { container } = render(await page());
    expect(getPrincipal).toHaveBeenCalled();
    expect(inspect).toHaveBeenCalledWith(TOKEN, ada);
    expect(screen.getByRole("heading", { level: 1, name: "Mentor invitation" })).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent("This invitation is not valid.Ask the DevMentor team for a new email.");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(container.innerHTML).not.toContain(TOKEN);
    expect(apiCall).not.toHaveBeenCalled();
  });

  it("asks a signed-out visitor to sign in or register with the invited address, keeping this invitation as returnTo", async () => {
    vi.mocked(getPrincipal).mockResolvedValue(null);
    inspect.mockResolvedValue({ status: "signed-out" });
    render(await page());
    expect(inspect).toHaveBeenCalledWith(TOKEN, null);
    expect(screen.getByText(/using the email address that received this invitation/)).toBeVisible();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", `/sign-in?returnTo=${ENCODED_PATH}`);
    expect(screen.getByRole("link", { name: "Create an account" })).toHaveAttribute("href", `/sign-up?returnTo=${ENCODED_PATH}`);
    expect(screen.queryByRole("button", { name: "Accept invitation" })).not.toBeInTheDocument();
  });

  it("drops a token that would not make a safe returnTo (nested path, reserved root)", async () => {
    vi.mocked(getPrincipal).mockResolvedValue(null);
    inspect.mockResolvedValue({ status: "signed-out" });
    render(await page("x/../../api/users"));
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in");
    expect(screen.getByRole("link", { name: "Create an account" })).toHaveAttribute("href", "/sign-up");
  });

  it("shows a mismatching account its own email, the re-invite hint and no Accept; sign-out returns to this invitation", async () => {
    inspect.mockResolvedValue({ status: "mismatch", currentEmail: "ada@work.example" });
    let finish!: (result: ApiResult<{ redirectTo: string }>) => void;
    vi.mocked(apiCall).mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const { container } = render(await page());
    const notice = screen.getByRole("alert");
    expect(notice).toHaveTextContent("This invitation requires the verified email address it was sent to.");
    expect(notice).toHaveTextContent("You are signed in as ada@work.example.");
    expect(notice).toHaveTextContent("Or ask the DevMentor team to re-invite ada@work.example.");
    expect(screen.queryByRole("button", { name: "Accept invitation" })).not.toBeInTheDocument();
    expect(container.innerHTML).not.toContain("ada@example.com");

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(apiCall).toHaveBeenCalledWith("/api/auth/sign-out", { method: "POST", signal: expect.any(AbortSignal) });
    expect(navigateFully).not.toHaveBeenCalled();
    finish({ ok: true, data: { redirectTo: "/" } });
    // Not the API's default `/`: back to the same validated invitation path, signed out.
    await waitFor(() => expect(navigateFully).toHaveBeenCalledWith(`/invite/${TOKEN}`));
  });

  it("stays on the page when the switch-account sign-out fails", async () => {
    inspect.mockResolvedValue({ status: "mismatch", currentEmail: "ada@work.example" });
    vi.mocked(apiCall).mockResolvedValue(fail("internal_error", "Something went wrong"));
    render(await page());
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(screen.getAllByRole("alert").at(-1)).toHaveTextContent("Something went wrong"));
    expect(navigateFully).not.toHaveBeenCalled();
  });

  it("tells an existing mentor there is nothing to accept", async () => {
    inspect.mockResolvedValue({ status: "already-mentor" });
    render(await page());
    expect(screen.getByRole("status")).toHaveTextContent("You already have the mentor role.");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("names the account that will receive mentor, accepts with the token and fully navigates home only after success", async () => {
    inspect.mockResolvedValue({ status: "valid", displayName: "Ada Nowak", email: "ada@example.com" });
    let finish!: (result: ApiResult<unknown>) => void;
    vi.mocked(apiCall).mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    render(await page());
    expect(screen.getByText(/This account will receive the mentor role/))
      .toHaveTextContent("Accept as Ada Nowak (ada@example.com). This account will receive the mentor role.");

    fireEvent.click(screen.getByRole("button", { name: "Accept invitation" }));
    fireEvent.click(screen.getByRole("button", { name: "Accepting invitation…" }));
    expect(apiCall).toHaveBeenCalledOnce();
    expect(apiCall).toHaveBeenCalledWith("/api/auth/invitations/accept", {
      method: "POST", body: { token: TOKEN }, signal: expect.any(AbortSignal),
    });
    expect(navigateFully).not.toHaveBeenCalled();
    finish({ ok: true, data: { id: "user-1", roles: ["mentee", "mentor"] } });
    // E01 standalone: home with the accepted notice, never the unshipped /mentor.
    await waitFor(() => expect(navigateFully).toHaveBeenCalledWith("/?invitation=accepted"));
    expect(INVITATION_ACCEPTED_DESTINATION).toBe("/?invitation=accepted");
  });

  it.each([
    [fail("forbidden", "This invitation requires the verified email address it was sent to"), "This invitation requires the verified email address it was sent to"],
    [fail("not_found", "This invitation is not valid"), "This invitation is not valid"],
    [fail("conflict", "You already have the mentor role"), "You already have the mentor role"],
    [fail("rate_limited", "Too many"), "Too many attempts. Try again later"],
  ])("stays on the page after a failed accept: %j", async (result, text) => {
    inspect.mockResolvedValue({ status: "valid", displayName: "Ada Nowak", email: "ada@example.com" });
    vi.mocked(apiCall).mockResolvedValue(result);
    render(await page());
    fireEvent.click(screen.getByRole("button", { name: "Accept invitation" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(text));
    expect(screen.getByRole("button", { name: "Accept invitation" })).toBeEnabled();
    expect(navigateFully).not.toHaveBeenCalled();
  });

  it("fully navigates to sign-in with the session-expired banner, back to this invitation, when accept answers 401 (SM-AC2, R12)", async () => {
    inspect.mockResolvedValue({ status: "valid", displayName: "Ada Nowak", email: "ada@example.com" });
    vi.mocked(apiCall).mockResolvedValue(fail("unauthorized", "Authentication required"));
    render(await page());
    fireEvent.click(screen.getByRole("button", { name: "Accept invitation" }));
    await waitFor(() => expect(navigateFully).toHaveBeenCalledWith(`/sign-in?error=session_expired&returnTo=${ENCODED_PATH}`));
    expect(navigateFully).toHaveBeenCalledOnce();
    // Never the success destination, never the server's message: the form stays pending until the browser leaves.
    expect(screen.queryByText("Authentication required")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Accepting invitation…" })).toBeDisabled();
  });

  it("falls back to returnTo=/ for an expired session when the panel has no invitation path", async () => {
    vi.mocked(apiCall).mockResolvedValue(fail("unauthorized", "Authentication required"));
    render(<AppInvitationPanel state={{ status: "valid", displayName: "Ada", email: "ada@example.com" }} token={TOKEN} invitationPath={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Accept invitation" }));
    await waitFor(() => expect(navigateFully).toHaveBeenCalledWith("/sign-in?error=session_expired&returnTo=%2F"));
  });

  it("refuses to post a valid state without its token", async () => {
    render(<AppInvitationPanel state={{ status: "valid", displayName: "Ada", email: "ada@example.com" }} invitationPath={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Accept invitation" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("This invitation is not valid"));
    expect(apiCall).not.toHaveBeenCalled();
  });
});
