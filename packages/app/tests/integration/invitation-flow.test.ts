import { randomUUID } from "node:crypto";
import { appendFile } from "node:fs/promises";
import { createServer } from "node:net";
import { join } from "node:path";

import { afterAll, afterEach, describe, expect, inject, it } from "vitest";

import { IntegrationBrowser } from "./browser";
import { openStalledGitHubRequests, setGitHubStubStall, setGitHubStubUser, type GitHubStubStall } from "./github-stub";
import {
  expectEvidenceFreeOf,
  expectSecretFree,
  githubSession,
  invitationPage,
  invitationRows,
  newestInvitationToken,
  operator,
  postAccept,
  query,
  rolesOf,
} from "./invitations";
import { linksIn, MailpitInbox } from "./mailpit";

/**
 * Email-bound mentor invitations end to end (E01 Flow 3, step 3.4): the real
 * operator CLI emails the link to Mailpit, the browser follows it, and the
 * page, the accept API and the database agree. The describe blocks run in
 * order in one browser session (`-inv`).
 *
 * Rate limits (TRUST_PROXY is unset, so only per-address rules apply): each
 * invitee address here signs up once (1 of 3 confirmation emails) and
 * confirms once (1 of 5 sign-in/confirm attempts); the throwaway sign-up
 * address sends one confirmation email. The expired-session invitee uses
 * GitHub only, so it spends no email-rule attempts, and so does the
 * stalled-provider invitee (R13). Every address is unique
 * to this file.
 *
 * Evidence: `IntegrationBrowser` redacts `/invite/<token>` and `token=` in
 * everything it writes, and the last case asserts that no text artifact of
 * the run holds any raw invitation or confirmation token seen here.
 */
describe("mentor invitations (CLI, Mailpit, browser)", () => {
  const baseURL = inject("baseURL");
  const artifactsDirectory = inject("integrationArtifactsDirectory");
  const browser = new IntegrationBrowser(`${inject("browserSession")}-inv`, artifactsDirectory);
  const inbox = new MailpitInbox(inject("mailpitURL"));
  const suffix = randomUUID().slice(0, 8);
  const seed = 5_000_000 + Math.floor(Math.random() * 1_000_000);

  const grace = { id: seed, name: "Grace Invitee", email: `inv-grace-${suffix}@example.com` };
  const mallory = { id: seed + 1, name: "Mallory Other", email: `inv-mallory-${suffix}@example.com` };
  const eve = { id: seed + 2, name: "Eve Expired", email: `inv-eve-${suffix}@example.com` };
  const fay = { id: seed + 3, name: "Fay Stalled", email: `inv-fay-${suffix}@example.com` };
  const ada = { name: "Ada Invitee", email: `inv-ada-${suffix}@example.com`, password: "a lighthouse on the far shore" };
  const bea = { name: "Bea Invitee", email: `inv-bea-${suffix}@example.com`, password: "a lantern in the old harbour" };
  const cleo = `inv-cleo-${suffix}@example.com`;
  const dora = `inv-dora-${suffix}@example.com`;
  const everyone = [grace.email, mallory.email, eve.email, fay.email, ada.email, bea.email, cleo, dora];

  /** Every raw token this file sees; none may appear in the evidence. */
  const seenTokens: string[] = [];

  afterEach(async ({ task }) => {
    try {
      await browser.capture(`invitation-${task.name}`);
    } catch (error) {
      await appendFile(join(artifactsDirectory, "capture.log"), `${task.name}: ${String(error)}\n`);
    }
  });

  // Other scenarios count users: remove the invitations, the accounts (roles,
  // sessions and links cascade) and the buckets, whatever order Vitest runs in.
  afterAll(async () => {
    try {
      await setGitHubStubStall(inject("githubStubURL"), null);
      await query("delete from mentor_invitations where email = any($1)", [everyone]);
      await query("delete from users where email = any($1)", [everyone]);
      await query("delete from rate_limit_buckets");
    } finally {
      await browser.command("close");
    }
  });

  function invitationURL(token: string): string {
    return `${baseURL}/invite/${token}`;
  }

  async function headerText(): Promise<string> {
    return (await browser.snapshot()).split(/^\s*- main/m)[0]!;
  }

  async function mainText(): Promise<string> {
    return (await browser.snapshot()).split(/^\s*- main/m)[1] ?? "";
  }

  async function sessionCookie(): Promise<string | undefined> {
    return (await browser.cookies()).find((cookie) => cookie.name === "devmentor_session")?.value;
  }

  async function browserCookie(): Promise<string> {
    const value = await sessionCookie();
    if (!value) throw new Error("The browser session has no session cookie");
    return `devmentor_session=${value}`;
  }

  // A full browser navigation discards the page's JavaScript state.
  async function markPage(): Promise<void> {
    await browser.command("eval", "window.__invitationProbe = true");
  }
  async function pageKept(): Promise<boolean> {
    return (await browser.command("eval", "window.__invitationProbe === true")).result === true;
  }

  async function create(email: string): Promise<string> {
    const before = (await inbox.messagesTo(email)).length;
    const result = await operator(["invite", "create", "--email", email]);
    expect(result.code).toBe(0);
    expect(result.stdout).toMatch(new RegExp(`Invitation created: id [0-9a-f-]{36}, email ${email.replace(/[.]/g, "\\.")}, expires \\d{4}-`));
    expect(result.stdout).toContain("Delivery: email accepted by the mail server.");
    const token = await newestInvitationToken(inbox, email, before + 1);
    seenTokens.push(token);
    expectSecretFree(result, [token]);
    return token;
  }

  /** Signs the browser in through the GitHub stub from the current sign-in page. */
  async function authorizeGitHub(decision: "Authorize" | "Cancel"): Promise<void> {
    await browser.click("link", "Sign in with GitHub");
    await browser.waitForText("Authorize DevMentor");
    await browser.click("link", decision);
  }

  /** From the signed-out invitation page: the panel's Sign in (the header has one too). */
  async function signInFromInvitation(token: string): Promise<void> {
    await browser.command("open", invitationURL(token));
    await browser.waitForText("Sign in or create an account using the email address that received this invitation.");
    await browser.click("link", "Sign in", { nth: 1 });
    await browser.waitForText("Sign in with GitHub");
    expect(await browser.url()).toBe(`${baseURL}/sign-in?returnTo=${encodeURIComponent(`/invite/${token}`)}`);
  }

  /** Signs up on the current /sign-up page, confirms from Mailpit and lands back on the invitation. */
  async function signUpAndConfirm(person: typeof ada, token: string): Promise<void> {
    await browser.waitForText("Use the email address that received your invitation.");
    expect(await browser.url()).toBe(`${baseURL}/sign-up?returnTo=${encodeURIComponent(`/invite/${token}`)}`);
    // No open mentor registration: the form asks for name, address and password only.
    const form = await mainText();
    expect(form).not.toMatch(/\bmentor\b|\brole\b/i);
    expect(form.match(/textbox "[^"]+"/g)).toEqual(['textbox "Display name"', 'textbox "Email"', 'textbox "Password"']);
    await browser.fill("Display name", person.name);
    await browser.fill("Email", person.email);
    await browser.fill("Password", person.password);
    await browser.click("button", "Create account");
    await browser.waitForText(`Check your inbox at ${person.email}`);

    const message = await inbox.waitForMessageTo(person.email);
    expect(message.Subject).toBe("Confirm your email address for DevMentor");
    const link = linksIn(message.Text).find((url) => url.pathname === "/confirm-email")!;
    seenTokens.push(link.searchParams.get("token")!);
    // The invitation path survives sign-up and the confirmation email.
    expect(link.searchParams.get("returnTo")).toBe(`/invite/${token}`);
    await browser.command("open", `${baseURL}${link.pathname}${link.search}`);
    await browser.waitForText(`Enter your password to confirm ${person.email}`);
    await browser.fill("Password", person.password);
    await browser.click("button", "Confirm");
    await browser.command("wait", "--url", invitationURL(token));
    await browser.waitForText("This account will receive the mentor role.");
  }

  /** Accept invitation, then the full navigation to home with the one-time notice. */
  async function acceptInBrowser(): Promise<void> {
    await markPage();
    await browser.click("button", "Accept invitation");
    await browser.waitForText("Invitation accepted. You're now a mentor.");
    // The flag is dropped from the address once shown.
    await browser.command("wait", "--fn", "location.pathname === '/' && location.search === ''");
    expect(await pageKept()).toBe(false);
  }

  describe("a matching GitHub account", () => {
    let token = "";

    it("CLI create emails the link only to the bound address and prints no token or URL", async () => {
      // An existing account with more than mentee: GitHub sign-in, then a real operator grant.
      await githubSession(grace);
      const grant = await operator(["role", "grant", "--email", grace.email, "--role", "operator"]);
      expect(grant.code).toBe(0);
      expect(await rolesOf(grace.email)).toEqual(["mentee", "operator"]);

      token = await create(grace.email);
      const [row] = await invitationRows(grace.email);
      expect(row).toMatchObject({ consumed_at: null, revoked_at: null, accepted_by_user_id: null });
    });

    it("follows the link signed out, signs in with GitHub and sees which account receives mentor", async () => {
      await browser.command("cookies", "clear");
      await setGitHubStubUser(inject("githubStubURL"), {
        id: grace.id, login: `gh-${grace.id}`, name: grace.name,
        emails: [{ email: grace.email, primary: true, verified: true }],
      });
      await signInFromInvitation(token);
      await authorizeGitHub("Authorize");
      await browser.waitForText("This account will receive the mentor role.");
      expect(await browser.url()).toBe(invitationURL(token));
      const panel = await mainText();
      expect(panel).toContain(grace.name);
      expect(panel).toContain(grace.email);
      expect(await browser.visible("button", "Accept invitation")).toBe(true);
    });

    it("accepts once, fully navigates home, keeps the session and shows every role plus mentor without Mentor setup", async () => {
      const before = await sessionCookie();
      await acceptInBrowser();
      expect(await sessionCookie()).toBe(before);
      const header = await headerText();
      expect(header).toContain(grace.name);
      expect(header).toContain("Backend");
      // E02 Phase 1 has not shipped: no link to the unbuilt mentor area.
      expect(header).not.toContain("Mentor setup");

      const [user] = await query<{ id: string }>("select id from users where email = $1", [grace.email]);
      const [invitation] = await invitationRows(grace.email);
      expect(invitation!.consumed_at).not.toBeNull();
      expect(invitation!.accepted_by_user_id).toBe(user!.id);
      expect(await query("select invitation_id from user_roles where user_id = $1 and role = 'mentor'", [user!.id]))
        .toEqual([{ invitation_id: invitation!.id }]);
      expect(await rolesOf(grace.email)).toEqual(["mentee", "mentor", "operator"]);

      await browser.command("open", `${baseURL}/account`);
      await browser.waitForText(grace.email);
      const account = await mainText();
      for (const role of ["mentee", "mentor", "operator"]) expect(account).toContain(role);
      expect(await headerText()).not.toContain("Mentor setup");
    });

    it("cannot grant again when the link is reopened", async () => {
      await browser.command("open", invitationURL(token));
      await browser.waitForText("This invitation is not valid.");
      expect(await browser.snapshot()).not.toContain("Accept invitation");
      const forced = await postAccept(token, await browserCookie());
      expect(forced.status).toBe(404);
      expect((await forced.json()).error.code).toBe("not_found");
      expect(await rolesOf(grace.email)).toEqual(["mentee", "mentor", "operator"]);
    });

    it("an already-mentor consumes nothing: the page says so and a forced accept is 409", async () => {
      const second = await create(grace.email);
      await browser.command("open", invitationURL(second));
      await browser.waitForText("You already have the mentor role.");
      expect(await browser.snapshot()).not.toContain("Accept invitation");
      const forced = await postAccept(second, await browserCookie());
      expect(forced.status).toBe(409);
      expect((await forced.json()).error.code).toBe("conflict");
      const rows = await invitationRows(grace.email);
      expect(rows).toHaveLength(2);
      expect(rows[1]).toMatchObject({ consumed_at: null, revoked_at: null, accepted_by_user_id: null });

      const revoke = await operator(["invite", "revoke", "--email", grace.email]);
      expect(revoke.code).toBe(0);
      expect(revoke.stdout).toContain(`Invitation revoked: id ${rows[1]!.id}, email ${grace.email}. Its link no longer works.`);
      expectSecretFree(revoke, [second]);
      expect(await rolesOf(grace.email)).toEqual(["mentee", "mentor", "operator"]);
    });
  });

  describe("a different GitHub account, then the invited address by email", () => {
    let token = "";

    it("sees no Accept button, gets 403 on a forced accept, and the invitation stays usable", async () => {
      token = await create(ada.email);
      await browser.command("cookies", "clear");
      await setGitHubStubUser(inject("githubStubURL"), {
        id: mallory.id, login: `gh-${mallory.id}`, name: mallory.name,
        emails: [{ email: mallory.email, primary: true, verified: true }],
      });
      await signInFromInvitation(token);
      await authorizeGitHub("Authorize");
      await browser.waitForText("This invitation requires the verified email address it was sent to.");
      // A new account returns to the invitation (with the welcome flag the page ignores).
      expect(new URL(await browser.url()).pathname).toBe(`/invite/${token}`);
      const page = await browser.snapshot();
      expect(page).toContain(mallory.email);
      expect(page).not.toContain(ada.email);
      expect(page).not.toContain("Accept invitation");

      const forced = await postAccept(token, await browserCookie());
      expect(forced.status).toBe(403);
      expect((await forced.json()).error.code).toBe("forbidden");
      expect(await invitationRows(ada.email)).toEqual([expect.objectContaining({ consumed_at: null, revoked_at: null })]);
      expect(await rolesOf(mallory.email)).toEqual(["mentee"]);
    });

    it("Sign out returns to the same invitation, signed out", async () => {
      await markPage();
      // The header has a Sign out too; the panel's comes second.
      await browser.click("button", "Sign out", { nth: 1 });
      await browser.waitForText("Sign in or create an account using the email address that received this invitation.");
      expect(await browser.url()).toBe(invitationURL(token));
      expect(await pageKept()).toBe(false);
      expect(await headerText()).not.toContain("Sign out");
      expect(await sessionCookie()).toBeUndefined();
    });

    it("registers the invited address, confirms it by email, returns and accepts", async () => {
      await browser.click("link", "Create an account");
      await signUpAndConfirm(ada, token);
      await acceptInBrowser();
      expect(await headerText()).toContain(ada.name);
      expect(await rolesOf(ada.email)).toEqual(["mentee", "mentor"]);
      expect(await rolesOf(mallory.email)).toEqual(["mentee"]);
    });
  });

  describe("GitHub cancelled from an invitation, then email", () => {
    it("keeps the invitation path through the cancel, sign-up and confirmation, then accepts", async () => {
      const token = await create(bea.email);
      await browser.command("open", `${baseURL}/`);
      await browser.click("button", "Sign out");
      await browser.waitForText("Sign in");
      await signInFromInvitation(token);
      await authorizeGitHub("Cancel");
      await browser.waitForText("GitHub sign-in was cancelled.");
      expect(await browser.url()).toBe(`${baseURL}/sign-in?error=github_cancelled&returnTo=${encodeURIComponent(`/invite/${token}`)}`);
      await browser.click("link", "sign in with email");
      await browser.click("link", "Create an account");
      await signUpAndConfirm(bea, token);
      await acceptInBrowser();
      expect(await rolesOf(bea.email)).toEqual(["mentee", "mentor"]);
    });
  });

  describe("a session that expires before Accept (SM-AC2, R12)", () => {
    let token = "";

    it("Accept fully navigates to sign-in with the session-expired banner and this invitation as returnTo", async () => {
      token = await create(eve.email);
      await browser.command("cookies", "clear");
      await setGitHubStubUser(inject("githubStubURL"), {
        id: eve.id, login: `gh-${eve.id}`, name: eve.name,
        emails: [{ email: eve.email, primary: true, verified: true }],
      });
      await signInFromInvitation(token);
      await authorizeGitHub("Authorize");
      await browser.waitForText("This account will receive the mentor role.");
      expect(new URL(await browser.url()).pathname).toBe(`/invite/${token}`);

      // Signed out elsewhere (or expired): the database row goes, the browser keeps its cookie.
      await query("delete from auth_sessions where user_id = (select id from users where email = $1)", [eve.email]);
      await markPage();
      await browser.click("button", "Accept invitation");
      await browser.waitForText("Your session expired.");
      expect(await browser.url()).toBe(`${baseURL}/sign-in?error=session_expired&returnTo=${encodeURIComponent(`/invite/${token}`)}`);
      expect(await pageKept()).toBe(false);
      expect(await browser.snapshot()).not.toContain("Authentication required");
      expect(await invitationRows(eve.email)).toEqual([expect.objectContaining({ consumed_at: null, accepted_by_user_id: null })]);
      expect(await rolesOf(eve.email)).toEqual(["mentee"]);
    });

    it("signs in again, lands back on the same invitation and accepts it", async () => {
      await authorizeGitHub("Authorize");
      await browser.command("wait", "--url", invitationURL(token));
      await browser.waitForText("This account will receive the mentor role.");
      await acceptInBrowser();
      expect(await headerText()).toContain(eve.name);
      expect(await rolesOf(eve.email)).toEqual(["mentee", "mentor"]);
    });
  });

  describe("a GitHub provider that stalls (R13)", () => {
    const stubURL = inject("githubStubURL");
    let token = "";

    afterAll(async () => {
      await setGitHubStubStall(stubURL, null);
    });

    it.each<GitHubStubStall>([
      { path: "/login/oauth/access_token", mode: "headers" },
      { path: "/login/oauth/access_token", mode: "body" },
      { path: "/user/emails", mode: "headers" },
      { path: "/user", mode: "body" },
    ])("$path stalled ($mode): the callback gives up within the bound and keeps this invitation as returnTo", async (stall) => {
      if (!token) {
        token = await create(fay.email);
        await browser.command("cookies", "clear");
        await setGitHubStubUser(stubURL, {
          id: fay.id, login: `gh-${fay.id}`, name: fay.name,
          emails: [{ email: fay.email, primary: true, verified: true }],
        });
      }
      await setGitHubStubStall(stubURL, stall);
      await signInFromInvitation(token);
      await browser.click("link", "Sign in with GitHub");
      await browser.waitForText("Authorize DevMentor");
      const started = Date.now();
      await browser.click("link", "Authorize");
      await browser.waitForText("GitHub sign-in failed.");
      const elapsed = Date.now() - started;
      expect(await browser.url()).toBe(`${baseURL}/sign-in?error=github_failed&returnTo=${encodeURIComponent(`/invite/${token}`)}`);
      // The adapter's 10 s bound, not a quicker failure, ended the attempt.
      expect(elapsed).toBeGreaterThanOrEqual(9_500);
      expect(elapsed).toBeLessThan(20_000);
      // The stalled request was cancelled, not left open on the provider.
      await expect.poll(() => openStalledGitHubRequests(stubURL)).toBe(0);
      expect(await sessionCookie()).toBeUndefined();
    });

    it("once GitHub answers again, signs in and returns to the same invitation", async () => {
      await setGitHubStubStall(stubURL, null);
      await authorizeGitHub("Authorize");
      await browser.command("wait", "--url", invitationURL(token));
      await browser.waitForText("This account will receive the mentor role.");
      expect(await rolesOf(fay.email)).toEqual(["mentee"]);
    });
  });

  describe("operator revoke and resend", () => {
    let current = "";

    it("revoke makes an unused link invalid", async () => {
      const token = await create(cleo);
      expect(await invitationPage(token)).toContain("Sign in or create an account");
      const revoke = await operator(["invite", "revoke", "--email", cleo]);
      expect(revoke.code).toBe(0);
      expect(revoke.stdout).toContain("Its link no longer works.");
      expectSecretFree(revoke, [token]);
      expect(await invitationPage(token)).toContain("This invitation is not valid.");

      const again = await operator(["invite", "revoke", "--email", cleo]);
      expect(again.code).toBe(0);
      expect(again.stdout).toContain(`${cleo} has no open invitation; nothing changed.`);
    });

    it("resend emails a replacement link and the old one stops working", async () => {
      const old = await create(cleo);
      const [before] = (await invitationRows(cleo)).filter((row) => !row.revoked_at);
      const resend = await operator(["invite", "resend", "--email", cleo]);
      expect(resend.code).toBe(0);
      expect(resend.stdout).toContain(`Invitation resent: id ${before!.id}, email ${cleo}`);
      expect(resend.stdout).toContain("Delivery: email accepted by the mail server.");
      current = await newestInvitationToken(inbox, cleo, 3);
      seenTokens.push(current);
      expectSecretFree(resend, [old, current]);
      expect(current).not.toBe(old);
      expect(await invitationPage(old)).toContain("This invitation is not valid.");
      expect(await invitationPage(current)).toContain("Sign in or create an account");
      // Rotated in place: still one open row, a new hash.
      const open = (await invitationRows(cleo)).filter((row) => !row.revoked_at && !row.consumed_at);
      expect(open).toEqual([expect.objectContaining({ id: before!.id })]);
      expect(open[0]!.token_hash).not.toBe(before!.token_hash);
    });

    it("a failed resend (SMTP down) exits 1, sends nothing and still invalidates the old link", async () => {
      // A port that was free a moment ago: nothing listens, so the connection is refused.
      const closed = await new Promise<number>((resolve, reject) => {
        const server = createServer();
        server.once("error", reject);
        server.listen(0, "127.0.0.1", () => {
          const address = server.address();
          server.close(() => resolve(typeof address === "object" && address ? address.port : 0));
        });
      });
      const resend = await operator(["invite", "resend", "--email", cleo], { smtpURL: `smtp://127.0.0.1:${closed}` });
      expect(resend.code).toBe(1);
      expect(resend.stderr).toContain("Delivery: failed, the invitation email was not sent. The invitation is saved. Its previous link no longer works.");
      expect(resend.stderr).toContain(`npm run operator -- invite resend --email ${cleo}`);
      expectSecretFree(resend, [current]);
      expect(await invitationPage(current)).toContain("This invitation is not valid.");
      await browser.command("wait", "500");
      expect(await inbox.messagesTo(cleo)).toHaveLength(3);

      const revoke = await operator(["invite", "revoke", "--email", cleo]);
      expect(revoke.code).toBe(0);
      expect((await invitationRows(cleo)).every((row) => row.revoked_at !== null)).toBe(true);
    });
  });

  it("offers no open mentor registration: the CLI refuses mentor and sign-up ignores role keys", async () => {
    const grant = await operator(["role", "grant", "--email", grace.email, "--role", "mentor"]);
    expect(grant.code).toBe(1);
    expect(grant.stderr).toContain("The mentor role is granted only by accepting an invitation.");

    const signUp = await fetch(`${baseURL}/api/auth/sign-up`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-devmentor-csrf": "1" },
      body: JSON.stringify({ displayName: "Dora", email: dora, password: "a compass in the top drawer", role: "mentor", roles: ["mentor"] }),
    });
    expect(signUp.status).toBe(201);
    expect(await rolesOf(dora)).toEqual(["mentee"]);
    const message = await inbox.waitForMessageTo(dora);
    seenTokens.push(linksIn(message.Text).find((url) => url.pathname === "/confirm-email")!.searchParams.get("token")!);
  });

  it("leaves no raw invitation or confirmation token in the run's evidence", async () => {
    await expectEvidenceFreeOf(seenTokens);
  });
});
