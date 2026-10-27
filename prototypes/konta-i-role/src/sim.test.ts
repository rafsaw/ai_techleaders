import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  acceptInvitation, confirmEmail, getSim, githubCallback, inspectInvitation, inspectLink, navigate, reset, resendConfirmation,
  saveDisplayName, setClockOffset, setScenario, signInWithEmail, signOut, signUp, switchAccount, userOf, chooseGithubIdentity, screenChanged,
} from "./sim";

/** The simulated server answers after a short pause; fake timers skip it. */
async function done<T>(promise: Promise<T>): Promise<T> {
  await vi.advanceTimersByTimeAsync(400);
  return promise;
}

let screens: string[];
const onNavigate = (event: Event) => screens.push((event as CustomEvent<string>).detail);

beforeEach(() => {
  vi.useFakeTimers();
  screens = [];
  document.addEventListener("prototype:navigate", onNavigate);
  reset();
  screens = [];
});

afterEach(() => {
  document.removeEventListener("prototype:navigate", onNavigate);
});

describe("navigate", () => {
  it("announces the screen and stores what it was opened with", () => {
    navigate("/sign-in?returnTo=%2Finvite%2Fdemo-bartek");
    expect(screens).toEqual(["s01"]);
    expect(getSim().params.s01).toEqual({ returnTo: "/invite/demo-bartek" });
  });

  it("applies the gates for the person who is signed in", () => {
    navigate("/account");
    expect(screens.at(-1)).toBe("s01");
    switchAccount("a1");
    navigate("/backend");
    expect(screens.at(-1)).toBe("s11");
    switchAccount("a5");
    navigate("/backend");
    expect(screens.at(-1)).toBe("s08");
    navigate("/sign-in");
    expect(screens.at(-1)).toBe("s07");
  });

  it("opens the error page for everything while the database is down, except the error page and the inbox", () => {
    setScenario({ network: "database_down" });
    navigate("/");
    expect(screens.at(-1)).toBe("s12");
    navigate("/demo-inbox");
    expect(screens.at(-1)).toBe("s13");
  });

  it("carries the invitation through sign-in pages while c14 is on", () => {
    setScenario({ returnToInvite: true });
    navigate("/sign-up");
    expect(getSim().params.s02).toEqual({ returnTo: "/invite/demo-bartek" });
  });

  it("ends an expired session at the next request and says so on sign-in", () => {
    switchAccount("a1");
    setScenario({ sessionExpired: true });
    navigate("/account");
    expect(userOf()).toBeNull();
    expect(screens.at(-1)).toBe("s01");
    expect(getSim().params.s01).toEqual({ returnTo: "/account", error: "session_expired" });
  });

  it("ends a session after 30 idle days", () => {
    switchAccount("a1");
    setClockOffset(31 * 86_400_000);
    navigate("/");
    expect(userOf()).toBeNull();
  });

  it("forgets one-time notices when the person leaves the screen that showed them", () => {
    screenChanged("s07");
    screenChanged("s06");
    expect(getSim().currentScreen).toBe("s06");
    reset();
  });
});

describe("email sign-up and confirmation (#35)", () => {
  it("creates an unconfirmed account that cannot sign in until the link is used", async () => {
    const result = await done(signUp({ displayName: "Nina", email: "Nina@Example.test", password: "bardzo-dlugie-haslo-1" }));
    expect(result).toEqual({ ok: true, data: { email: "nina@example.test", emailSent: true } });

    const early = await done(signInWithEmail({ email: "nina@example.test", password: "bardzo-dlugie-haslo-1" }));
    expect(early).toMatchObject({ ok: false, error: { code: "email_not_confirmed" } });

    const mail = getSim().mails.at(-1)!;
    expect(mail.subject).toBe("Confirm your DevMentor email address");
    const token = new URL(mail.href!, "https://x.test").searchParams.get("token")!;
    expect(inspectLink(token)).toMatchObject({ status: "valid", email: "nina@example.test" });

    const wrong = await done(confirmEmail(token, "zle-haslo-zle-haslo"));
    expect(wrong).toMatchObject({ ok: false, error: { code: "invalid_credentials" } });
    expect(inspectLink(token).status).toBe("valid");

    const confirmed = await done(confirmEmail(token, "bardzo-dlugie-haslo-1", "/invite/demo-celina"));
    expect(confirmed).toEqual({ ok: true, data: { redirectTo: "/invite/demo-celina" } });
    expect(userOf()?.email).toBe("nina@example.test");
    expect(inspectLink(token).status).toBe("used");
  });

  it("replaces an unconfirmed registration and invalidates its earlier link", async () => {
    await done(signUp({ displayName: "Ewa", email: "ewa.lis@example.test", password: "druga-rejestracja-123" }));
    expect(inspectLink("ewa-valid").status).toBe("invalid");
  });

  it("answers the same for a confirmed address and sends a different mail", async () => {
    const result = await done(signUp({ displayName: "Ktoś", email: "tomek.wisniewski@example.test", password: "bardzo-dlugie-haslo-1" }));
    expect(result).toMatchObject({ ok: true, data: { emailSent: true } });
    expect(getSim().mails.at(-1)?.subject).toBe("You already have a DevMentor account");
  });

  it("reports an unsent mail without changing anything when the address limit is used up", async () => {
    setScenario({ mail: "limit" });
    const before = getSim().accounts.length;
    const result = await done(signUp({ displayName: "Nina", email: "nina@example.test", password: "bardzo-dlugie-haslo-1" }));
    expect(result).toMatchObject({ ok: true, data: { emailSent: false } });
    expect(getSim().accounts).toHaveLength(before);
  });

  it("still creates the account when SMTP is down, but sends no mail", async () => {
    setScenario({ mail: "smtp_down" });
    const mails = getSim().mails.length;
    const result = await done(signUp({ displayName: "Nina", email: "nina@example.test", password: "bardzo-dlugie-haslo-1" }));
    expect(result).toMatchObject({ ok: true, data: { emailSent: false } });
    expect(getSim().mails).toHaveLength(mails);
  });

  it("resends only to someone who knows the password, and uses the neutral text when it cannot send", async () => {
    const bad = await done(resendConfirmation({ email: "ewa.lis@example.test", password: "zle-haslo-zle-haslo" }));
    expect(bad).toMatchObject({ ok: false, error: { code: "invalid_credentials" } });
    setScenario({ mail: "smtp_down" });
    const down = await done(resendConfirmation({ email: "ewa.lis@example.test", password: "kamienna-brama-2026-x" }));
    expect(down).toEqual({ ok: false, error: { code: "email_not_sent", message: "We couldn't send the email. Please try again later." } });
    setScenario({ mail: "ok" });
    const sent = await done(resendConfirmation({ email: "ewa.lis@example.test", password: "kamienna-brama-2026-x" }));
    expect(sent).toEqual({ ok: true, data: { emailSent: true, alreadyConfirmed: false } });
  });

  it("expires the confirmation link after 24 hours of demo time", () => {
    expect(inspectLink("ewa-valid").status).toBe("valid");
    setClockOffset(25 * 3_600_000);
    expect(inspectLink("ewa-valid").status).toBe("expired");
  });

  it("answers 429 and generic errors the way the spec says", async () => {
    setScenario({ rateLimited: true });
    expect(await done(signInWithEmail({ email: "a@b.test", password: "x" }))).toMatchObject({ ok: false, error: { code: "rate_limited" } });
    setScenario({ rateLimited: false });
    expect(await done(signInWithEmail({ email: "ola.nowak@example.test", password: "x" }))).toMatchObject({ ok: false, error: { code: "invalid_credentials" } });
    setScenario({ network: "offline" });
    expect(await done(signInWithEmail({ email: "a@b.test", password: "x" }))).toMatchObject({ ok: false, error: { code: "network_error" } });
  });
});

describe("GitHub sign-in (#34)", () => {
  it("creates an account named from GitHub and lands on /account?welcome=1", () => {
    expect(githubCallback(undefined, false)).toBe("/account?welcome=1");
    expect(userOf()).toMatchObject({ displayName: "Jakub Lis", roles: ["mentee"], githubLogin: "kuba-lis" });
    expect(getSim().welcomePendingFor).toBe(userOf()!.id);
  });

  it("does not create a second account the second time", () => {
    chooseGithubIdentity("ola");
    const accounts = getSim().accounts.length;
    expect(githubCallback(undefined, false)).toBe("/");
    expect(getSim().accounts).toHaveLength(accounts);
    expect(userOf()?.displayName).toBe("Ola Nowak");
  });

  it("goes back to where the person came from after signing in", () => {
    chooseGithubIdentity("wiktor");
    expect(githubCallback("/invite/demo-wiktor", false)).toBe("/invite/demo-wiktor");
    expect(getSim().welcomePendingFor).toBe(userOf()!.id);
  });

  it.each([
    [true, "authorize", "github_cancelled"],
    [false, "denied", "github_cancelled"],
    [false, "unavailable", "github_failed"],
    [false, "state_expired", "github_failed"],
    [false, "no_email", "github_no_verified_email"],
    [false, "email_taken", "github_email_taken"],
  ] as const)("denied=%s with result %s ends on sign-in with %s and creates nothing", (denied, github, error) => {
    setScenario({ github });
    const accounts = getSim().accounts.length;
    expect(githubCallback("/invite/demo-bartek", denied)).toBe(`/sign-in?error=${error}&returnTo=%2Finvite%2Fdemo-bartek`);
    expect(getSim().accounts).toHaveLength(accounts);
    expect(userOf()).toBeNull();
  });
});

describe("invitations (#36)", () => {
  it("lets the matching account accept once and become mentee and mentor", async () => {
    switchAccount("i1");
    expect(inspectInvitation("demo-bartek")).not.toBeNull();
    const result = await done(acceptInvitation("demo-bartek"));
    expect(result).toEqual({ ok: true, data: { redirectTo: "/" } });
    expect(userOf()?.roles).toEqual(["mentee", "mentor"]);
    expect(getSim().homeNotice).toBe("Invitation accepted. You're now a mentor.");
    expect(inspectInvitation("demo-bartek")).toBeNull();
  });

  it.each(["demo-wygasle", "demo-odwolane", "demo-uzyte", "demo-zly-token"])("treats %s as not valid", (token) => {
    expect(inspectInvitation(token)).toBeNull();
  });

  it("expires invitations with the demo clock", () => {
    setClockOffset(15 * 86_400_000);
    expect(inspectInvitation("demo-bartek")).toBeNull();
  });

  it("refuses an account with another address and consumes nothing", async () => {
    switchAccount("a1");
    const result = await done(acceptInvitation("demo-bartek"));
    expect(result).toMatchObject({ ok: false, error: { code: "forbidden" } });
    expect(inspectInvitation("demo-bartek")).not.toBeNull();
  });

  it.each([
    ["race", "invitation_invalid"],
    ["other_address", "forbidden"],
    ["already_mentor", "already_mentor"],
  ] as const)("fails the next accept with %s, then works again", async (accept, code) => {
    switchAccount("i1");
    setScenario({ accept });
    expect(await done(acceptInvitation("demo-bartek"))).toMatchObject({ ok: false, error: { code } });
    expect(getSim().scenario.accept).toBe("ok");
  });

  it("needs a session that the server still knows", async () => {
    switchAccount("i1");
    setScenario({ sessionExpired: true });
    expect(await done(acceptInvitation("demo-bartek"))).toMatchObject({ ok: false, error: { code: "session_expired" } });
    expect(userOf()).toBeNull();
  });
});

describe("account and sign-out", () => {
  it("saves the display name", async () => {
    switchAccount("a1");
    expect(await done(saveDisplayName({ displayName: "  Ola N.  " }))).toEqual({ ok: true, data: { displayName: "Ola N." } });
    expect(userOf()?.displayName).toBe("Ola N.");
  });

  it("returns a field error once when c11 asks for one", async () => {
    switchAccount("a1");
    setScenario({ nameSaveError: true });
    expect(await done(saveDisplayName({ displayName: "Ola" }))).toMatchObject({ ok: false, error: { fieldErrors: { displayName: ["Use 1–100 characters."] } } });
    expect(getSim().scenario.nameSaveError).toBe(false);
  });

  it("ends the session when it expired while the form was open", async () => {
    switchAccount("a1");
    setScenario({ sessionExpired: true });
    expect(await done(saveDisplayName({ displayName: "Ola" }))).toMatchObject({ ok: false, error: { message: "Your session expired. Sign in again." } });
    expect(getSim().expiredNotice).toBe(true);
  });

  it("signs out, and fails when the server is down", async () => {
    switchAccount("a1");
    setScenario({ network: "database_down" });
    expect(await done(signOut())).toMatchObject({ ok: false });
    expect(userOf()).not.toBeNull();
    setScenario({ network: "ok" });
    expect(await done(signOut())).toEqual({ ok: true, data: { redirectTo: "/" } });
    expect(userOf()).toBeNull();
  });
});
