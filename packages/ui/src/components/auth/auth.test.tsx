import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { ApiResult } from "../../api/types";
import { AccountSummary } from "./AccountSummary";
import { CHECK_EMAIL_EXPIRY, CheckEmailNotice, EMAIL_NOT_SENT } from "./CheckEmailNotice";
import { ConfirmEmailPanel } from "./ConfirmEmailPanel";
import { InvitationPanel, type InvitationAction } from "./InvitationPanel";
import { GITHUB_ERRORS, SIGN_IN_ERRORS, SignInOptions } from "./SignInOptions";
import { SiteHeader } from "./SiteHeader";
import { DISPLAY_NAME_HINT, INVITED_NOTICE, SignUpForm } from "./SignUpForm";
import { WELCOME_TITLE, WelcomeNotice } from "./WelcomeNotice";

const credentials = z.object({ email: z.email("Enter a valid email address"), password: z.string().min(1, "Enter your password") });
const fail = (code: string, message: string): ApiResult<never> => ({ ok: false, error: { code, message } });

function fillAndSignIn() {
  fireEvent.change(screen.getByRole("textbox", { name: "Email" }), { target: { value: "ada@example.com" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "correct horse battery" } });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("SignInOptions", () => {
  it("offers GitHub only in Phase 1 and shows a banner for each known error code", () => {
    const { rerender } = render(<SignInOptions githubHref="/api/auth/github" />);
    expect(screen.getByRole("link", { name: "Sign in with GitHub" })).toHaveAttribute("href", "/api/auth/github");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(Object.keys(SIGN_IN_ERRORS)).toEqual([...Object.keys(GITHUB_ERRORS), "session_expired"]);
    for (const [code, entry] of Object.entries(SIGN_IN_ERRORS)) {
      rerender(<SignInOptions githubHref="/api/auth/github" error={code} />);
      expect(screen.getByRole(entry.variant === "error" ? "alert" : "status")).toHaveTextContent(entry.title);
    }
    rerender(<SignInOptions githubHref="/api/auth/github" error="session_expired" />);
    expect(screen.getByRole("status")).toHaveTextContent("Your session expired.Sign in again.");
    rerender(<SignInOptions githubHref="/api/auth/github" error="something_else" />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("signs in with email and hands the redirect to the page", async () => {
    const onSignedIn = vi.fn();
    const signIn = vi.fn().mockResolvedValue({ ok: true, data: { redirectTo: "/account" } });
    render(<SignInOptions githubHref="/g" email={{ schema: credentials, signIn, resend: vi.fn(), onSignedIn, signUpHref: "/sign-up" }} />);
    expect(screen.getByRole("link", { name: "Create an account" })).toHaveAttribute("href", "/sign-up");
    expect(screen.getByRole("status")).toHaveTextContent("Password reset is not available yet.");
    fillAndSignIn();
    await waitFor(() => expect(onSignedIn).toHaveBeenCalledWith("/account"));
    expect(screen.queryByRole("button", { name: "Resend confirmation" })).not.toBeInTheDocument();
  });

  it("offers Resend confirmation for an unconfirmed address and reports each result", async () => {
    const resend = vi.fn()
      .mockResolvedValueOnce({ ok: true, data: { emailSent: true, alreadyConfirmed: false } })
      .mockResolvedValueOnce({ ok: true, data: { emailSent: false, alreadyConfirmed: false } })
      .mockResolvedValueOnce({ ok: true, data: { emailSent: false, alreadyConfirmed: true } })
      .mockResolvedValueOnce(fail("rate_limited", "Too many attempts. Try again later"));
    const signIn = vi.fn()
      .mockResolvedValueOnce(fail("email_not_confirmed", "Confirm your email first"))
      .mockResolvedValueOnce(fail("invalid_credentials", "Email or password is incorrect"));
    render(<SignInOptions githubHref="/g" email={{ schema: credentials, signIn, resend, onSignedIn: vi.fn(), signUpHref: "/sign-up" }} />);
    fillAndSignIn();
    const resendButton = await screen.findByRole("button", { name: "Resend confirmation" });
    expect(screen.getByRole("alert")).toHaveTextContent("Confirm your email first");

    fireEvent.click(resendButton);
    expect(await screen.findByText("Check your inbox at ada@example.com")).toBeVisible();
    expect(resend).toHaveBeenCalledWith({ email: "ada@example.com", password: "correct horse battery" });
    fireEvent.click(screen.getByRole("button", { name: "Resend confirmation" }));
    expect(await screen.findByText("We couldn't send the email. Please try again later.")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Resend confirmation" }));
    expect(await screen.findByText("Your address is already confirmed — sign in.")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Resend confirmation" }));
    expect(await screen.findByText("Too many attempts. Try again later")).toBeVisible();
    // Every 429 reads the same, whatever the server's wording (SM-AC4, SM-AC17).
    resend.mockResolvedValueOnce(fail("rate_limited", "Retry after 3600 s"));
    fireEvent.click(screen.getByRole("button", { name: "Resend confirmation" }));
    await waitFor(() => expect(screen.getAllByRole("alert").at(-1)).toHaveTextContent("Too many attempts. Try again later"));

    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Resend confirmation" })).not.toBeInTheDocument());
  });
});

describe("SignInOptions: resend in flight", () => {
  it("sends one resend at a time", async () => {
    const resend = vi.fn().mockReturnValue(new Promise(() => {}));
    const signIn = vi.fn().mockResolvedValue(fail("email_not_confirmed", "Confirm your email first"));
    render(<SignInOptions githubHref="/g" email={{ schema: credentials, signIn, resend, onSignedIn: vi.fn(), signUpHref: "/sign-up" }} />);
    fillAndSignIn();
    const form = (await screen.findByRole("button", { name: "Resend confirmation" })).closest("form")!;
    fireEvent.submit(form);
    await waitFor(() => expect(screen.getByRole("button", { name: "Resending…" })).toBeDisabled());
    fireEvent.submit(form);
    expect(resend).toHaveBeenCalledOnce();
  });
});

describe("SignInOptions: cancelled GitHub sign-in (Phase 2)", () => {
  it("links the cancelled banner to the email form and moves focus to the email field", async () => {
    const signIn = vi.fn().mockResolvedValue({ ok: true, data: { redirectTo: "/" } });
    render(<SignInOptions githubHref="/g" error="github_cancelled" email={{ schema: credentials, signIn, resend: vi.fn(), onSignedIn: vi.fn(), signUpHref: "/sign-up" }} />);
    expect(screen.getAllByRole("status")[0]).toHaveTextContent("GitHub sign-in was cancelled.Try again, or sign in with email.");
    const link = screen.getByRole("link", { name: "sign in with email" });
    expect(link).toHaveAttribute("href", "#sign-in-email");
    expect(screen.getByRole("region", { name: "Sign in with email" })).toHaveAttribute("id", "sign-in-email");
    expect(fireEvent.click(link)).toBe(false);
    expect(screen.getByRole("textbox", { name: "Email" })).toHaveFocus();
    // The request gets the form's abort signal.
    fillAndSignIn();
    await waitFor(() => expect(signIn).toHaveBeenCalledWith({ email: "ada@example.com", password: "correct horse battery" }, { signal: expect.any(AbortSignal) }));
  });

  it("keeps the Phase 1 wording without the email form", () => {
    render(<SignInOptions githubHref="/g" error="github_cancelled" />);
    expect(screen.getByRole("status")).toHaveTextContent(/^GitHub sign-in was cancelled\.Try again$/);
    expect(screen.queryByRole("link", { name: "sign in with email" })).not.toBeInTheDocument();
  });
});

describe("CheckEmailNotice", () => {
  it("says where the link went and for how long, or that it could not be sent", () => {
    const { rerender } = render(<CheckEmailNotice email="ada@example.com" emailSent />);
    expect(screen.getByRole("status")).toHaveTextContent(`Check your inbox at ada@example.com${CHECK_EMAIL_EXPIRY}`);
    rerender(<CheckEmailNotice email="ada@example.com" emailSent={false} className="x" />);
    expect(screen.getByRole("alert")).toHaveTextContent(/^We couldn't send the email\. Please try again later\.$/);
    expect(screen.getByRole("alert")).toHaveClass("x");
    expect(screen.queryByText(/ada@example.com/)).not.toBeInTheDocument();
    expect(EMAIL_NOT_SENT).toBe("We couldn't send the email. Please try again later.");
  });
});

describe("SignUpForm", () => {
  const schema = z.object({
    displayName: z.string().trim().min(1, "Enter a display name"),
    email: z.email("Enter a valid email address"),
    password: z.string().min(15, "Use at least 15 characters"),
  });

  function fill() {
    fireEvent.change(screen.getByRole("textbox", { name: "Display name" }), { target: { value: "Ada" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Email" }), { target: { value: "ada@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "correct horse battery" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
  }

  it("shows N03 and the password rule before typing, and moves on only after the server answers", async () => {
    let finish!: (result: ApiResult<{ email: string; emailSent: boolean }>) => void;
    const submit = vi.fn().mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const onSignedUp = vi.fn();
    render(<SignUpForm schema={schema} submit={submit} onSignedUp={onSignedUp} signInHref="/sign-in?returnTo=%2Faccount" />);
    expect(screen.getByRole("status")).toHaveTextContent("Password reset is not available yet.");
    expect(screen.queryByText(INVITED_NOTICE)).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Display name" })).toHaveAccessibleDescription(DISPLAY_NAME_HINT);
    expect(screen.getByLabelText("Password")).toHaveAttribute("autocomplete", "new-password");
    expect(screen.getByLabelText("Password")).toHaveAccessibleDescription(/at least 15 characters/);
    expect(screen.getByRole("link", { name: "Sign in instead" })).toHaveAttribute("href", "/sign-in?returnTo=%2Faccount");
    fill();
    expect(screen.getByRole("button", { name: "Creating account…" })).toBeDisabled();
    expect(onSignedUp).not.toHaveBeenCalled();
    finish({ ok: true, data: { email: "ada@example.com", emailSent: false } });
    await waitFor(() => expect(onSignedUp).toHaveBeenCalledWith({ email: "ada@example.com", emailSent: false }));
  });

  it("explains the invitation address and shows failures without moving on", async () => {
    const submit = vi.fn().mockResolvedValue(fail("rate_limited", "Too many attempts. Try again later"));
    const onSignedUp = vi.fn();
    render(<SignUpForm schema={schema} submit={submit} onSignedUp={onSignedUp} signInHref="/sign-in" invited />);
    expect(screen.getAllByRole("status")[0]).toHaveTextContent(INVITED_NOTICE);
    fill();
    expect(await screen.findByRole("alert")).toHaveTextContent("Too many attempts. Try again later");
    expect(onSignedUp).not.toHaveBeenCalled();
    expect(screen.getByRole("textbox", { name: "Email" })).toHaveValue("ada@example.com");
  });
});

describe("ConfirmEmailPanel", () => {
  const schema = z.object({ password: z.string().min(1, "Enter your password") });

  it("asks for the password in the valid state and passes the redirect on", async () => {
    const onConfirmed = vi.fn();
    const submit = vi.fn().mockResolvedValue({ ok: true, data: { redirectTo: "/invite/abc" } });
    render(<ConfirmEmailPanel state={{ status: "valid", email: "ada@example.com" }} signInHref="/sign-in" confirm={{ schema, submit, onConfirmed }} />);
    expect(screen.getByText("ada@example.com")).toBeVisible();
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "correct horse battery" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(onConfirmed).toHaveBeenCalledWith("/invite/abc"));
  });

  it.each([
    ["expired", "status", "This link has expired.Sign in to get a new one."],
    ["used", "status", "Your address is already confirmed — sign in."],
    ["invalid", "alert", "This link isn't valid.Sign in to continue."],
  ] as const)("explains the %s state and links to sign-in", (status, role, text) => {
    render(<ConfirmEmailPanel state={{ status }} signInHref="/sign-in?returnTo=%2F" confirm={{ schema, submit: vi.fn(), onConfirmed: vi.fn() }} />);
    expect(screen.getByRole(role)).toHaveTextContent(text);
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in?returnTo=%2F");
  });

  it("keeps the form after a wrong password, and swaps it for the reason when the link stopped working", async () => {
    const submit = vi.fn()
      .mockResolvedValueOnce(fail("invalid_credentials", "Email or password is incorrect"))
      .mockResolvedValueOnce(fail("not_found", "Your address is already confirmed. Sign in"));
    const onConfirmed = vi.fn();
    render(<ConfirmEmailPanel state={{ status: "valid", email: "ada@example.com" }} signInHref="/sign-in" confirm={{ schema, submit, onConfirmed }} />);
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "wrong horse battery" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Email or password is incorrect");
    expect(screen.getByLabelText("Password")).toHaveValue("wrong horse battery");
    expect(submit).toHaveBeenCalledWith({ password: "wrong horse battery" }, { signal: expect.any(AbortSignal) });

    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Your address is already confirmed. Sign in"));
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in");
    expect(onConfirmed).not.toHaveBeenCalled();
  });
});

describe("InvitationPanel", () => {
  it("renders the invalid, signed-out and already-mentor states", () => {
    const { rerender } = render(<InvitationPanel state={{ status: "invalid" }} />);
    expect(screen.getByRole("alert")).toHaveTextContent("This invitation is not valid.Ask the DevMentor team for a new email.");
    rerender(<InvitationPanel state={{ status: "signed-out", signInHref: "/sign-in?returnTo=x", signUpHref: "/sign-up?returnTo=x" }} />);
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in?returnTo=x");
    expect(screen.getByRole("link", { name: "Create an account" })).toHaveAttribute("href", "/sign-up?returnTo=x");
    rerender(<InvitationPanel state={{ status: "already-mentor" }} />);
    expect(screen.getByRole("status")).toHaveTextContent("You already have the mentor role.");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  const tokenSchema = z.object({ token: z.string().min(1, "This invitation is not valid") });
  const noBody = z.object({});
  const action = (submit: InvitationAction["submit"], onDone = vi.fn(), values: Record<string, string> = { token: "tok" }) =>
    ({ schema: values.token === undefined ? noBody : tokenSchema, values, submit, onDone }) as InvitationAction;

  it("accepts for a matching account, posting the token with an abort signal, and shows the server's message on failure", async () => {
    const onAccepted = vi.fn();
    const accept = vi.fn()
      .mockResolvedValueOnce(fail("conflict", "You already have the mentor role"))
      .mockResolvedValueOnce({ ok: true, data: {} });
    render(<InvitationPanel state={{ status: "valid", displayName: "Ada Nowak", email: "ada@example.com", accept: action(accept, onAccepted) }} />);
    expect(screen.getByText(/This account will receive the mentor role/)).toHaveTextContent("Accept as Ada Nowak (ada@example.com).");
    fireEvent.click(screen.getByRole("button", { name: "Accept invitation" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("You already have the mentor role");
    expect(accept).toHaveBeenCalledWith({ token: "tok" }, { signal: expect.any(AbortSignal) });
    expect(onAccepted).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Accept invitation" }));
    await waitFor(() => expect(onAccepted).toHaveBeenCalledOnce());
  });

  it("sends one accept for a double click, and stays locked after success until the page navigates away", async () => {
    const onAccepted = vi.fn();
    const accept = vi.fn().mockResolvedValue({ ok: true, data: {} });
    render(<InvitationPanel state={{ status: "valid", displayName: "Ada", email: "ada@example.com", accept: action(accept, onAccepted) }} />);
    const button = screen.getByRole("button", { name: "Accept invitation" });
    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() => expect(onAccepted).toHaveBeenCalledOnce());
    // A late click after success (the navigation is still loading) posts nothing.
    expect(screen.getByRole("button", { name: "Accepting invitation…" })).toBeDisabled();
    fireEvent.submit(screen.getByRole("button", { name: "Accepting invitation…" }).closest("form")!);
    await Promise.resolve();
    expect(accept).toHaveBeenCalledOnce();
  });

  it("shows a 429 as the shared rate-limit message and a field-level failure as the form's", async () => {
    const accept = vi.fn()
      .mockResolvedValueOnce(fail("rate_limited", "Slow down"))
      .mockResolvedValueOnce({ ok: false, error: { code: "validation_error", message: "Invalid input", fieldErrors: { token: ["This invitation is not valid"] } } });
    render(<InvitationPanel state={{ status: "valid", displayName: "Ada", email: "ada@example.com", accept: action(accept) }} />);
    fireEvent.click(screen.getByRole("button", { name: "Accept invitation" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Too many attempts. Try again later");
    fireEvent.click(screen.getByRole("button", { name: "Accept invitation" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("This invitation is not valid"));
  });

  it("offers only sign-out to a mismatching account, without an Accept button or the invited address", async () => {
    const onSignedOut = vi.fn();
    const signOut = vi.fn().mockResolvedValue({ ok: true, data: { redirectTo: "/" } });
    render(<InvitationPanel state={{ status: "mismatch", currentEmail: "ada@work.example", signOut: action(signOut, onSignedOut, {}) }} />);
    expect(screen.getByRole("alert")).toHaveTextContent("You are signed in as ada@work.example.");
    expect(screen.getByRole("alert")).toHaveTextContent("Or ask the DevMentor team to re-invite ada@work.example.");
    expect(screen.queryByRole("button", { name: "Accept invitation" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(screen.getByRole("button", { name: "Signing out…" })).toBeDisabled();
    await waitFor(() => expect(onSignedOut).toHaveBeenCalledOnce());
    expect(signOut).toHaveBeenCalledWith({}, { signal: expect.any(AbortSignal) });
  });

  it("stays on the page when sign-out fails", async () => {
    const onSignedOut = vi.fn();
    const signOut = vi.fn().mockResolvedValue(fail("network_error", "Could not reach the server. Check your connection and try again."));
    render(<InvitationPanel state={{ status: "mismatch", currentEmail: "ada@work.example", signOut: action(signOut, onSignedOut, {}) }} />);
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(screen.getAllByRole("alert").at(-1)).toHaveTextContent("Could not reach the server."));
    expect(screen.getByRole("button", { name: "Sign out" })).toBeEnabled();
    expect(onSignedOut).not.toHaveBeenCalled();
  });
});

describe("AccountSummary", () => {
  it("shows the form, the read-only details and the welcome notice", () => {
    const { rerender } = render(
      <AccountSummary email="ada@example.com" roles={["mentee", "mentor"]} signInMethods={{ github: true, password: true }}>
        <form aria-label="Display name" />
      </AccountSummary>
    );
    expect(screen.getByRole("heading", { level: 2, name: "Account" })).toBeVisible();
    expect(screen.getByRole("form", { name: "Display name" })).toBeInTheDocument();
    expect(screen.getByText("ada@example.com")).toBeVisible();
    expect(screen.getByText("mentee")).toHaveAttribute("data-slot", "badge");
    expect(screen.getByText("GitHub, Email and password")).toBeVisible();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    rerender(
      <AccountSummary email="ada@example.com" roles={["mentee"]} signInMethods={{ github: true, password: false }} welcome>
        <form aria-label="Display name" />
      </AccountSummary>
    );
    expect(screen.getByRole("status")).toHaveTextContent("This is the name others see. You can change it.");
    expect(screen.getByText("GitHub")).toBeVisible();
  });
});

describe("SiteHeader", () => {
  it("offers Sign in when signed out", () => {
    render(<SiteHeader account={null} signInHref="/sign-in?returnTo=%2Fmentors%2F1" />);
    expect(screen.getByRole("link", { name: "DevMentor" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in?returnTo=%2Fmentors%2F1");
  });

  it("shows role links and the name, and signs out through the given call", async () => {
    const Link = ({ href, children, ...rest }: { href: string; className?: string; title?: string; children: ReactNode }) => (
      <a href={href} data-next-link {...rest}>{children}</a>
    );
    const onSignedOut = vi.fn();
    const signOut = vi.fn()
      .mockResolvedValueOnce(fail("internal_error", "Something went wrong"))
      .mockResolvedValueOnce({ ok: true, data: { redirectTo: "/" } });
    const { rerender } = render(
      <SiteHeader account={{ displayName: "Ada Nowak", roles: ["mentee", "mentor", "operator"] }} signOut={signOut} onSignedOut={onSignedOut} mentorSetupHref="/mentor" linkComponent={Link} />
    );
    expect(screen.getByRole("link", { name: "Mentor setup" })).toHaveAttribute("data-next-link");
    expect(screen.getByRole("link", { name: "Mentor setup" })).toHaveAttribute("href", "/mentor");
    expect(screen.getByRole("link", { name: "Backend" })).toHaveAttribute("href", "/backend");
    expect(screen.getByRole("link", { name: "Ada Nowak" })).toHaveAttribute("href", "/account");
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not sign out. Try again.");
    expect(screen.getByRole("button", { name: "Sign out" })).toHaveAccessibleDescription("Could not sign out. Try again.");
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(onSignedOut).toHaveBeenCalledWith("/"));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    rerender(<SiteHeader account={{ displayName: "Ada Nowak", roles: ["mentee"] }} mentorSetupHref="/mentor" />);
    expect(screen.queryByRole("link", { name: "Mentor setup" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Backend" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(screen.getByRole("button", { name: "Sign out" })).toBeEnabled();
  });

  it("omits Mentor setup for a mentor when the app gives no mentorSetupHref (E01: the page ships in E02)", () => {
    render(<SiteHeader account={{ displayName: "Ada Nowak", roles: ["mentee", "mentor", "operator"] }} />);
    expect(screen.queryByRole("link", { name: "Mentor setup" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Backend" })).toBeInTheDocument();
  });
});

describe("WelcomeNotice", () => {
  it("says the name is public and links to Account settings", () => {
    render(<WelcomeNotice displayName="Ada Nowak" className="mt-4" />);
    const notice = screen.getByRole("status");
    expect(notice).toHaveTextContent(WELCOME_TITLE);
    expect(notice).toHaveTextContent("Your display name: Ada Nowak");
    expect(notice).toHaveClass("mt-4");
    expect(screen.getByRole("link", { name: "Change it in Account settings" })).toHaveAttribute("href", "/account");
  });

  it("uses the same words as the /account notice and the injected link component", () => {
    const Link = ({ href, children, ...rest }: { href: string; className?: string; children: ReactNode }) => (
      <a href={href} data-next-link {...rest}>{children}</a>
    );
    render(<WelcomeNotice displayName="Ada" accountHref="/account?tab=name" linkComponent={Link} />);
    expect(screen.getByRole("link", { name: "Change it in Account settings" })).toHaveAttribute("href", "/account?tab=name");
    expect(screen.getByRole("link")).toHaveAttribute("data-next-link");
    expect(WELCOME_TITLE).toBe("This is the name others see. You can change it.");
  });
});
