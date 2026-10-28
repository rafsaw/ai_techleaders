import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { ApiResult } from "../../api/types";
import { AccountSummary } from "./AccountSummary";
import { ConfirmEmailPanel } from "./ConfirmEmailPanel";
import { InvitationPanel } from "./InvitationPanel";
import { GITHUB_ERRORS, SignInOptions } from "./SignInOptions";
import { SiteHeader } from "./SiteHeader";

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
    for (const [code, entry] of Object.entries(GITHUB_ERRORS)) {
      rerender(<SignInOptions githubHref="/api/auth/github" error={code} />);
      expect(screen.getByRole(entry.variant === "error" ? "alert" : "status")).toHaveTextContent(entry.title);
    }
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
    expect(await screen.findByText("We couldn't send the email — try again")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Resend confirmation" }));
    expect(await screen.findByText("Your address is already confirmed — sign in.")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Resend confirmation" }));
    expect(await screen.findByText("Too many attempts. Try again later")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Resend confirmation" })).not.toBeInTheDocument());
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
    ["invalid", "alert", "This link isn't valid.If you registered more than once, use the link in the most recent email."],
  ] as const)("explains the %s state and links to sign-in", (status, role, text) => {
    render(<ConfirmEmailPanel state={{ status }} signInHref="/sign-in?returnTo=%2F" confirm={{ schema, submit: vi.fn(), onConfirmed: vi.fn() }} />);
    expect(screen.getByRole(role)).toHaveTextContent(text);
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in?returnTo=%2F");
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

  it("accepts for a matching account and shows the server's message on failure", async () => {
    const onAccepted = vi.fn();
    const accept = vi.fn()
      .mockResolvedValueOnce(fail("conflict", "You already have the mentor role"))
      .mockResolvedValueOnce({ ok: true, data: {} });
    render(<InvitationPanel state={{ status: "valid", displayName: "Ada Nowak", email: "ada@example.com", accept, onAccepted }} />);
    expect(screen.getByText(/This account will receive the mentor role/)).toHaveTextContent("Accept as Ada Nowak (ada@example.com).");
    fireEvent.click(screen.getByRole("button", { name: "Accept invitation" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("You already have the mentor role");
    expect(onAccepted).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Accept invitation" }));
    await waitFor(() => expect(onAccepted).toHaveBeenCalledOnce());
  });

  it("offers only sign-out to a mismatching account, without an Accept button", async () => {
    const onSignedOut = vi.fn();
    const signOut = vi.fn().mockResolvedValue({ ok: true, data: { redirectTo: "/" } });
    render(<InvitationPanel state={{ status: "mismatch", currentEmail: "ada@work.example", signOut, onSignedOut }} />);
    expect(screen.getByRole("alert")).toHaveTextContent("You are signed in as ada@work.example.");
    expect(screen.queryByRole("button", { name: "Accept invitation" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(screen.getByRole("button", { name: "Signing out…" })).toBeDisabled();
    await waitFor(() => expect(onSignedOut).toHaveBeenCalledOnce());
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
      <SiteHeader account={{ displayName: "Ada Nowak", roles: ["mentee", "mentor", "operator"] }} signOut={signOut} onSignedOut={onSignedOut} linkComponent={Link} />
    );
    expect(screen.getByRole("link", { name: "Mentor setup" })).toHaveAttribute("data-next-link");
    expect(screen.getByRole("link", { name: "Backend" })).toHaveAttribute("href", "/backend");
    expect(screen.getByRole("link", { name: "Ada Nowak" })).toHaveAttribute("href", "/account");
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not sign out. Try again.");
    expect(screen.getByRole("button", { name: "Sign out" })).toHaveAccessibleDescription("Could not sign out. Try again.");
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(onSignedOut).toHaveBeenCalledWith("/"));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    rerender(<SiteHeader account={{ displayName: "Ada Nowak", roles: ["mentee"] }} />);
    expect(screen.queryByRole("link", { name: "Mentor setup" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Backend" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(screen.getByRole("button", { name: "Sign out" })).toBeEnabled();
  });
});
