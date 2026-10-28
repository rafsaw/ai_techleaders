import { randomUUID } from "node:crypto";
import { appendFile } from "node:fs/promises";
import { join } from "node:path";

import pg from "pg";
import { afterAll, afterEach, describe, expect, inject, it } from "vitest";

import { IntegrationBrowser } from "./browser";
import { linksIn, MailpitInbox } from "./mailpit";

/**
 * Email and password accounts in the browser (E01 step 2.6): /sign-up,
 * /sign-up/check-email, /sign-in with Resend, /confirm-email in its four
 * states, full navigation after a successful confirmation or sign-in, and the
 * GitHub-cancelled banner's link to the email form. The steps run in order
 * in their own browser session, against Mailpit and the test database.
 *
 * Rate limits (TRUST_PROXY is unset, so only the per-address rules apply):
 * Ada spends exactly 5 of rule 2 (sign-in and confirm, 5 per 15 minutes) and
 * 4 attempts on rule 4 (3 confirmation emails per hour), the fourth refused.
 */
describe("password accounts UI", () => {
  const baseURL = inject("baseURL");
  const artifactsDirectory = inject("integrationArtifactsDirectory");
  const browser = new IntegrationBrowser(`${inject("browserSession")}-password`, artifactsDirectory);
  const inbox = new MailpitInbox(inject("mailpitURL"));

  const ada = { name: "Ada Password", email: `pw-ada-${randomUUID()}@example.com`, password: "a teapot on the windowsill" };
  const bob = { name: "Bob Password", email: `pw-bob-${randomUUID()}@example.com`, password: "a kettle on the windowsill" };

  async function query<T extends pg.QueryResultRow>(text: string, values: unknown[] = []): Promise<T[]> {
    const client = new pg.Client({ connectionString: inject("databaseURL") });
    await client.connect();
    try {
      return (await client.query<T>(text, values)).rows;
    } finally {
      await client.end();
    }
  }

  afterEach(async ({ task }) => {
    try {
      await browser.capture(`password-${task.name}`);
    } catch (error) {
      await appendFile(join(artifactsDirectory, "capture.log"), `${task.name}: ${String(error)}\n`);
    }
  });

  // Other scenarios count users: remove both accounts (roles, sessions and
  // links cascade) and the buckets, whatever order Vitest runs the files in.
  afterAll(async () => {
    try {
      await query("delete from users where email = any($1)", [[ada.email, bob.email]]);
      await query("delete from rate_limit_buckets");
    } finally {
      await browser.command("close");
    }
  });

  /** Confirmation links sent to `email`, newest first. */
  async function confirmationLinks(email: string): Promise<URL[]> {
    const links: URL[] = [];
    for (const summary of await inbox.messagesTo(email)) {
      const message = await inbox.message(summary.ID);
      links.push(...linksIn(message.Text).filter((url) => url.pathname === "/confirm-email"));
    }
    return links;
  }

  /** The link as the app under test serves it (the email uses APP_URL). */
  function onApp(link: URL): string {
    return `${baseURL}${link.pathname}${link.search}`;
  }

  async function userRow(email: string) {
    const [row] = await query<{ id: string; name: string; password_hash: string | null; email_confirmed_at: Date | null }>(
      "select id, name, password_hash, email_confirmed_at from users where email = $1", [email]);
    return row!;
  }

  function tokenRows(userId: string) {
    return query<{ token_hash: string; consumed_at: Date | null }>(
      "select token_hash, consumed_at from email_confirmation_tokens where user_id = $1 order by created_at", [userId]);
  }

  // A full browser navigation discards the page's JavaScript state; a client
  // navigation or no navigation keeps it.
  async function markPage(): Promise<void> {
    await browser.command("eval", "window.__passwordUiProbe = true");
  }
  async function pageKept(): Promise<boolean> {
    return (await browser.command("eval", "window.__passwordUiProbe === true")).result === true;
  }

  async function headerText(): Promise<string> {
    return (await browser.snapshot()).split(/^\s*- main/m)[0]!;
  }

  async function signUp(person: typeof ada) {
    await browser.fill("Display name", person.name);
    await browser.fill("Email", person.email);
    await browser.fill("Password", person.password);
    await browser.click("button", "Create account");
  }

  it("signs up on /sign-up and the confirmation email reaches Mailpit", async () => {
    await browser.command("cookies", "clear");
    await browser.command("open", `${baseURL}/sign-up`);
    await browser.waitForText("Create an account");
    const page = await browser.snapshot();
    expect(page).toContain("Password reset is not available yet.");
    expect(page).toContain("Use a short phrase of at least 15 characters.");
    await markPage();
    await signUp(ada);
    await browser.waitForText(`Check your inbox at ${ada.email}`);
    expect(await browser.url()).toBe(`${baseURL}/sign-up/check-email?email=${encodeURIComponent(ada.email)}`);
    expect(await browser.snapshot()).toContain("The link expires in 24 hours.");
    // Signing up changes no identity: a client navigation.
    expect(await pageKept()).toBe(true);

    const message = await inbox.waitForMessageTo(ada.email);
    expect(message.Subject).toBe("Confirm your email address for DevMentor");
    const [link] = await confirmationLinks(ada.email);
    expect(link!.searchParams.has("returnTo")).toBe(false);
    const user = await userRow(ada.email);
    expect(user).toMatchObject({ name: ada.name, email_confirmed_at: null });
  });

  it("refuses sign-in before confirming, and Resend sends a second message", async () => {
    await browser.command("open", `${baseURL}/sign-in`);
    await browser.waitForText("Sign in with email");
    await browser.fill("Email", ada.email);
    await browser.fill("Password", ada.password);
    await browser.click("button", "Sign in");
    await browser.waitForText("Confirm your email first");
    expect(await browser.url()).toBe(`${baseURL}/sign-in`);
    expect(await headerText()).not.toContain("Sign out");

    await browser.click("button", "Resend confirmation");
    await browser.waitForText(`Check your inbox at ${ada.email}`);
    await inbox.waitForMessageTo(ada.email, { count: 2 });
  });

  it("shows the first, replaced link as not valid", async () => {
    const links = await confirmationLinks(ada.email);
    expect(links).toHaveLength(2);
    await browser.command("open", onApp(links[1]!));
    await browser.waitForText("This link isn't valid.");
    const page = await browser.snapshot();
    expect(page).toContain("Sign in to continue.");
    expect(page).not.toContain("Enter your password to confirm");
  });

  it("keeps the address unconfirmed after a wrong password on the newest link", async () => {
    const [newest] = await confirmationLinks(ada.email);
    await browser.command("open", onApp(newest!));
    await browser.waitForText(`Enter your password to confirm ${ada.email}`);
    await markPage();
    await browser.fill("Password", "not the phrase I chose");
    await browser.click("button", "Confirm");
    await browser.waitForText("Email or password is incorrect");
    expect(await browser.url()).toBe(onApp(newest!));
    expect(await pageKept()).toBe(true);
    const user = await userRow(ada.email);
    expect(user.email_confirmed_at).toBeNull();
    expect((await tokenRows(user.id)).map((row) => row.consumed_at)).toEqual([null]);
  });

  it("after rule 4 is used up, a sign-up changes nothing and sends nothing; the check page says so", async () => {
    // The third confirmation email of the hour (rule 4: 3 per address).
    const resend = await fetch(`${baseURL}/api/auth/confirm-email/resend`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-devmentor-csrf": "1" },
      body: JSON.stringify({ email: ada.email, password: ada.password }),
    });
    expect(await resend.json()).toEqual({ ok: true, data: { emailSent: true, alreadyConfirmed: false } });
    await inbox.waitForMessageTo(ada.email, { count: 3 });
    const before = await userRow(ada.email);
    const tokensBefore = await tokenRows(before.id);
    expect(tokensBefore).toHaveLength(1);

    // A fourth attempt, with another name and password: the same answer, no change.
    await browser.command("open", `${baseURL}/sign-up`);
    await browser.waitForText("Create an account");
    await signUp({ ...ada, name: "Mallory", password: "a different long phrase" });
    await browser.waitForText("We couldn't send the email. Please try again later.");
    expect(await browser.url()).toBe(`${baseURL}/sign-up/check-email?email=${encodeURIComponent(ada.email)}&sent=0`);
    expect(await browser.visible("link", "Back to sign-up")).toBe(true);

    expect(await userRow(ada.email)).toEqual(before);
    expect(await tokenRows(before.id)).toEqual(tokensBefore);
    expect(await query("select id from users where email = $1", [ada.email])).toHaveLength(1);
    // Mail is delivered asynchronously: give a stray message time to arrive.
    await browser.command("wait", "500");
    expect(await inbox.messagesTo(ada.email)).toHaveLength(3);
  });

  it("confirms with the newest link and the original password, fully navigating to / signed in", async () => {
    const [newest] = await confirmationLinks(ada.email);
    await browser.command("open", onApp(newest!));
    await browser.waitForText(`Enter your password to confirm ${ada.email}`);
    await markPage();
    await browser.fill("Password", ada.password);
    await browser.click("button", "Confirm");
    await browser.command("wait", "--url", `${baseURL}/`);
    await browser.waitForText("Sign out");
    expect(await pageKept()).toBe(false);
    const header = await headerText();
    expect(header).toContain(ada.name);
    expect(header).toContain("Sign out");
    expect((await userRow(ada.email)).email_confirmed_at).not.toBeNull();

    await browser.command("open", `${baseURL}/account`);
    await browser.waitForText(ada.email);
    expect(await browser.snapshot()).toContain("Email and password");
  });

  it("reopening the link says the address is already confirmed", async () => {
    const [newest] = await confirmationLinks(ada.email);
    await browser.command("open", onApp(newest!));
    await browser.waitForText("Your address is already confirmed — sign in.");
    expect(await browser.snapshot()).not.toContain("Enter your password to confirm");
  });

  it("signs in with the password: a failure stays, success fully navigates to returnTo", async () => {
    await browser.command("open", `${baseURL}/`);
    await browser.click("button", "Sign out");
    await browser.waitForText("Sign in");
    expect(await headerText()).not.toContain("Sign out");

    const signIn = `${baseURL}/sign-in?returnTo=%2Faccount`;
    await browser.command("open", signIn);
    await browser.waitForText("Sign in with email");
    await markPage();
    await browser.fill("Email", ada.email);
    await browser.fill("Password", "not the phrase I chose");
    await browser.click("button", "Sign in");
    await browser.waitForText("Email or password is incorrect");
    expect(await browser.url()).toBe(signIn);
    expect(await pageKept()).toBe(true);

    await browser.fill("Password", ada.password);
    await browser.click("button", "Sign in");
    await browser.command("wait", "--url", `${baseURL}/account`);
    await browser.waitForText(ada.email);
    expect(await pageKept()).toBe(false);
    expect(await headerText()).toContain(ada.name);
  });

  it("shows an expired link as expired and a tampered one as not valid, without a referrer", async () => {
    const signUp = await fetch(`${baseURL}/api/auth/sign-up`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-devmentor-csrf": "1" },
      body: JSON.stringify({ displayName: bob.name, email: bob.email, password: bob.password, returnTo: "/account" }),
    });
    expect(signUp.status).toBe(201);
    await inbox.waitForMessageTo(bob.email);
    const [link] = await confirmationLinks(bob.email);
    expect(link!.searchParams.get("returnTo")).toBe("/account");

    const page = await fetch(onApp(link!));
    expect(page.headers.get("referrer-policy")).toBe("no-referrer");
    expect(await page.text()).toContain('<meta name="referrer" content="no-referrer"/>');

    const { id } = await userRow(bob.email);
    await query("update email_confirmation_tokens set expires_at = now() - interval '1 minute' where user_id = $1", [id]);
    await browser.command("open", onApp(link!));
    await browser.waitForText("This link has expired.");
    expect(await browser.snapshot()).toContain("Sign in to get a new one.");
    await browser.capture("password-confirm-expired");

    const tampered = new URL(link!);
    const token = tampered.searchParams.get("token")!;
    tampered.searchParams.set("token", `${token.slice(0, -1)}${token.endsWith("A") ? "B" : "A"}`);
    await browser.command("open", onApp(tampered));
    await browser.waitForText("This link isn't valid.");
    expect(await browser.snapshot()).toContain("Sign in to continue.");
  });

  it("links the GitHub-cancelled banner to the email form", async () => {
    await browser.command("cookies", "clear");
    await browser.command("open", `${baseURL}/sign-in?error=github_cancelled`);
    await browser.waitForText("GitHub sign-in was cancelled.");
    await browser.click("link", "sign in with email");
    expect((await browser.command("eval", 'document.activeElement?.getAttribute("name")')).result).toBe("email");
    expect(await browser.url()).toBe(`${baseURL}/sign-in?error=github_cancelled`);
  });
});
