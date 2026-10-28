import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Principal } from "@devmentor/core";
import { apiCall } from "@devmentor/ui/api/apiCall";
import type { ApiResult } from "@devmentor/ui/api/types";

import { checkEmailPath, first, isInvitation, withReturnTo } from "@/app/(frontend)/auth-links";
import ConfirmEmailPage, { metadata as confirmMetadata } from "@/app/(frontend)/confirm-email/page";
import SignInPage from "@/app/(frontend)/sign-in/page";
import CheckEmailPage, { metadata as checkEmailMetadata } from "@/app/(frontend)/sign-up/check-email/page";
import SignUpPage, { metadata as signUpMetadata } from "@/app/(frontend)/sign-up/page";
import { navigateFully } from "@/app/full-navigation";
import { getPrincipal } from "@/server/auth/page-guards";

const { inspectConfirmation, push } = vi.hoisted(() => ({ inspectConfirmation: vi.fn(), push: vi.fn() }));
vi.mock("@/server/auth/page-guards", () => ({ getPrincipal: vi.fn() }));
vi.mock("@/server/container", () => ({ createRequestScope: () => ({ cradle: { passwordAccountService: { inspectConfirmation } } }) }));
vi.mock("@devmentor/ui/api/apiCall", () => ({ apiCall: vi.fn() }));
vi.mock("@/app/full-navigation", () => ({ navigateFully: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  redirect: vi.fn((path: string) => { throw new Error(`redirect:${path}`); }),
}));

const ada: Principal = { userId: "user-1", sessionId: "session-1", displayName: "Ada", roles: ["mentee"] };
const PASSWORD = "a teapot on the windowsill";
const fail = (code: string, message: string): ApiResult<never> => ({ ok: false, error: { code, message } });
type Params = Record<string, string | string[] | undefined>;
const params = (value: Params = {}) => ({ searchParams: Promise.resolve(value) });

beforeEach(() => {
  vi.mocked(getPrincipal).mockReset().mockResolvedValue(null);
  vi.mocked(apiCall).mockReset();
  vi.mocked(navigateFully).mockReset();
  inspectConfirmation.mockReset();
  push.mockReset();
});

function type(label: string, value: string) {
  fireEvent.change(label === "Password" ? screen.getByLabelText("Password") : screen.getByRole("textbox", { name: label }), { target: { value } });
}

describe("auth links", () => {
  it("carries the validated returnTo last and only when there is one", () => {
    expect(first(["/a", "/b"])).toBe("/a");
    expect(first("/a")).toBe("/a");
    expect(withReturnTo("/sign-in", null)).toBe("/sign-in");
    expect(withReturnTo("/sign-in", "/invite/abc")).toBe("/sign-in?returnTo=%2Finvite%2Fabc");
    expect(checkEmailPath("ada@example.com", true, undefined)).toBe("/sign-up/check-email?email=ada%40example.com");
    expect(checkEmailPath("ada@example.com", false, "/account")).toBe("/sign-up/check-email?email=ada%40example.com&sent=0&returnTo=%2Faccount");
    expect(isInvitation("/invite/abc")).toBe(true);
    expect(isInvitation("/invitations")).toBe(false);
    expect(isInvitation(null)).toBe(false);
  });
});

describe("/sign-in email form", () => {
  async function signIn(returnTo?: string) {
    render(await SignInPage(params(returnTo ? { returnTo } : {})));
    type("Email", "Ada@Example.com");
    type("Password", PASSWORD);
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
  }

  it("posts email, password and returnTo, and fully navigates only after success", async () => {
    let finish!: (result: ApiResult<{ redirectTo: string }>) => void;
    vi.mocked(apiCall).mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    await signIn("/account");
    expect(apiCall).toHaveBeenCalledWith("/api/auth/sign-in", {
      method: "POST", body: { email: "ada@example.com", password: PASSWORD, returnTo: "/account" }, signal: expect.any(AbortSignal),
    });
    expect(screen.getByRole("button", { name: "Signing in…" })).toBeDisabled();
    expect(navigateFully).not.toHaveBeenCalled();
    finish({ ok: true, data: { redirectTo: "/account" } });
    await waitFor(() => expect(navigateFully).toHaveBeenCalledWith("/account"));
  });

  it.each([
    [fail("invalid_credentials", "Email or password is incorrect"), "Email or password is incorrect"],
    [fail("rate_limited", "Too many attempts. Try again later"), "Too many attempts. Try again later"],
    [fail("network_error", "Could not reach the server. Check your connection and try again."), "Could not reach the server."],
  ])("stays on the page with the error and the values: %j", async (result, text) => {
    vi.mocked(apiCall).mockResolvedValue(result);
    await signIn();
    expect(await screen.findByRole("alert")).toHaveTextContent(text);
    expect(apiCall).toHaveBeenCalledWith("/api/auth/sign-in", expect.objectContaining({ body: { email: "ada@example.com", password: PASSWORD } }));
    expect(screen.getByRole("textbox", { name: "Email" })).toHaveValue("Ada@Example.com");
    expect(navigateFully).not.toHaveBeenCalled();
  });

  it("offers Resend for an unconfirmed address and re-posts the same credentials and returnTo", async () => {
    vi.mocked(apiCall)
      .mockResolvedValueOnce(fail("email_not_confirmed", "Confirm your email first"))
      .mockResolvedValueOnce({ ok: true, data: { emailSent: true, alreadyConfirmed: false } });
    await signIn("/invite/abc");
    expect(await screen.findByRole("alert")).toHaveTextContent("Confirm your email first");
    fireEvent.click(screen.getByRole("button", { name: "Resend confirmation" }));
    expect(await screen.findByText("Check your inbox at ada@example.com")).toBeVisible();
    expect(apiCall).toHaveBeenLastCalledWith("/api/auth/confirm-email/resend", {
      method: "POST", body: { email: "ada@example.com", password: PASSWORD, returnTo: "/invite/abc" },
    });
    expect(navigateFully).not.toHaveBeenCalled();
  });
});

describe("/sign-up", () => {
  it("shows N03, the password rule and the sign-in link before typing", async () => {
    render(await SignUpPage(params()));
    expect(signUpMetadata.title).toBe("Create an account");
    expect(screen.getByRole("heading", { level: 1, name: "Create an account" })).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("Password reset is not available yet.Save your password in a password manager, or use GitHub sign-in.");
    expect(screen.getByLabelText("Password")).toHaveAccessibleDescription("Use a short phrase of at least 15 characters.");
    expect(screen.getByRole("link", { name: "Sign in instead" })).toHaveAttribute("href", "/sign-in");
    expect(screen.queryByText("Use the email address that received your invitation.")).not.toBeInTheDocument();
    expect(getPrincipal).toHaveBeenCalled();
  });

  it("explains an invitation's address and keeps its returnTo", async () => {
    render(await SignUpPage(params({ returnTo: "/invite/abc" })));
    expect(screen.getAllByRole("status")[0]).toHaveTextContent("Use the email address that received your invitation.");
    expect(screen.getByRole("link", { name: "Sign in instead" })).toHaveAttribute("href", "/sign-in?returnTo=%2Finvite%2Fabc");
  });

  it.each([
    [{}, "redirect:/"],
    [{ returnTo: "/invite/abc" }, "redirect:/invite/abc"],
    [{ returnTo: "//evil.example" }, "redirect:/"],
  ])("sends a signed-in visitor to the safe returnTo (SM-AC1): %j", async (search, target) => {
    vi.mocked(getPrincipal).mockResolvedValue(ada);
    await expect(SignUpPage(params(search))).rejects.toThrow(target);
  });

  it("validates with the shared schema before any request", async () => {
    render(await SignUpPage(params()));
    type("Display name", "Ada");
    type("Email", "ada@example.com");
    type("Password", "too short");
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("Use at least 15 characters. A short phrase works well")).toBeVisible();
    expect(screen.getByLabelText("Password")).toHaveFocus();
    expect(apiCall).not.toHaveBeenCalled();
  });

  it.each([
    [true, "/sign-up/check-email?email=ada%40example.com&returnTo=%2Finvite%2Fabc"],
    [false, "/sign-up/check-email?email=ada%40example.com&sent=0&returnTo=%2Finvite%2Fabc"],
  ])("moves on to Check your inbox after the server answered (emailSent %s)", async (emailSent, path) => {
    vi.mocked(apiCall).mockResolvedValue({ ok: true, data: { email: "ada@example.com", emailSent } });
    render(await SignUpPage(params({ returnTo: "/invite/abc" })));
    type("Display name", "Ada");
    type("Email", "ADA@example.com");
    type("Password", PASSWORD);
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith(path));
    expect(apiCall).toHaveBeenCalledWith("/api/auth/sign-up", {
      method: "POST", body: { displayName: "Ada", email: "ada@example.com", password: PASSWORD, returnTo: "/invite/abc" }, signal: expect.any(AbortSignal),
    });
    expect(navigateFully).not.toHaveBeenCalled();
  });

  it("stays on the page after a 429, without a returnTo in the request when there is none", async () => {
    vi.mocked(apiCall).mockResolvedValue(fail("rate_limited", "Too many attempts. Try again later"));
    render(await SignUpPage(params()));
    type("Display name", "Ada");
    type("Email", "ada@example.com");
    type("Password", PASSWORD);
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Too many attempts. Try again later");
    expect(apiCall).toHaveBeenCalledWith("/api/auth/sign-up", expect.objectContaining({ body: { displayName: "Ada", email: "ada@example.com", password: PASSWORD } }));
    expect(push).not.toHaveBeenCalled();
  });
});

describe("/sign-up/check-email", () => {
  it("says where the link went and how long it works", async () => {
    render(await CheckEmailPage(params({ email: "ada@example.com", returnTo: "/account" })));
    expect(checkEmailMetadata.title).toBe("Check your email");
    expect(screen.getByRole("heading", { level: 1, name: "Check your email" })).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("Check your inbox at ada@example.comThe link expires in 24 hours.");
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in?returnTo=%2Faccount");
    expect(getPrincipal).toHaveBeenCalled();
  });

  it("shows the not-sent message and a way back to sign-up (SM-AC3)", async () => {
    render(await CheckEmailPage(params({ email: "ada@example.com", sent: "0", returnTo: "/invite/abc" })));
    expect(screen.getByRole("alert")).toHaveTextContent(/^We couldn't send the email\. Please try again later\.$/);
    expect(screen.queryByText(/ada@example.com/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to sign-up" })).toHaveAttribute("href", "/sign-up?returnTo=%2Finvite%2Fabc");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it.each([{}, { email: "" }, { email: "not an address" }, { returnTo: "/account" }])(
    "redirects to /sign-up without a valid email (SM-AC5): %j", async (search) => {
      const target = "returnTo" in search ? "redirect:/sign-up?returnTo=%2Faccount" : "redirect:/sign-up";
      await expect(CheckEmailPage(params(search))).rejects.toThrow(target);
    });
});

describe("/confirm-email", () => {
  it("never leaks the token as a referrer", () => {
    expect(confirmMetadata).toEqual({ title: "Confirm your email", referrer: "no-referrer" });
  });

  it("inspects a valid link, confirms with the password and fully navigates only after success", async () => {
    inspectConfirmation.mockResolvedValue({ status: "valid", email: "ada@example.com" });
    let finish!: (result: ApiResult<{ redirectTo: string }>) => void;
    vi.mocked(apiCall).mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    render(await ConfirmEmailPage(params({ token: "tok", returnTo: "/account" })));
    expect(inspectConfirmation).toHaveBeenCalledWith("tok");
    expect(getPrincipal).toHaveBeenCalled();
    expect(screen.getByRole("heading", { level: 1, name: "Confirm your email" })).toBeVisible();
    expect(screen.getByText("ada@example.com")).toBeVisible();
    type("Password", PASSWORD);
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(apiCall).toHaveBeenCalledWith("/api/auth/confirm-email", {
      method: "POST", body: { token: "tok", password: PASSWORD, returnTo: "/account" }, signal: expect.any(AbortSignal),
    });
    expect(navigateFully).not.toHaveBeenCalled();
    finish({ ok: true, data: { redirectTo: "/account" } });
    await waitFor(() => expect(navigateFully).toHaveBeenCalledWith("/account"));
  });

  it.each([
    [fail("invalid_credentials", "Email or password is incorrect"), "Email or password is incorrect", true],
    [fail("rate_limited", "Too many attempts. Try again later"), "Too many attempts. Try again later", true],
    [fail("not_found", "This link has expired. Sign in to get a new one"), "This link has expired. Sign in to get a new one", false],
  ])("stays on the page after %j", async (result, text, formKept) => {
    inspectConfirmation.mockResolvedValue({ status: "valid", email: "ada@example.com" });
    vi.mocked(apiCall).mockResolvedValue(result);
    render(await ConfirmEmailPage(params({ token: "tok" })));
    type("Password", PASSWORD);
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(text));
    expect(apiCall).toHaveBeenCalledWith("/api/auth/confirm-email", expect.objectContaining({ body: { token: "tok", password: PASSWORD } }));
    expect(screen.queryByLabelText("Password") !== null).toBe(formKept);
    expect(navigateFully).not.toHaveBeenCalled();
  });

  it.each([
    ["expired", "status", "This link has expired.Sign in to get a new one."],
    ["used", "status", "Your address is already confirmed — sign in."],
    ["invalid", "alert", "This link isn't valid.Sign in to continue."],
  ] as const)("explains the %s state with Sign in and no token in the page", async (status, role, text) => {
    inspectConfirmation.mockResolvedValue({ status });
    const { container } = render(await ConfirmEmailPage(params({ token: "secret-token", returnTo: "/invite/abc" })));
    expect(screen.getByRole(role)).toHaveTextContent(text);
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in?returnTo=%2Finvite%2Fabc");
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
    expect(container.innerHTML).not.toContain("secret-token");
  });

  it("treats a link without a token as not valid, without a lookup", async () => {
    render(await ConfirmEmailPage(params()));
    expect(inspectConfirmation).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("This link isn't valid.Sign in to continue.");
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in");
  });
});
