import { randomUUID } from "node:crypto";

import { afterAll, describe, expect, inject, it } from "vitest";

import { IntegrationBrowser } from "./browser";
import { setGitHubStubUser } from "./github-stub";
import { query } from "./invitations";
import { linksIn, MailpitInbox } from "./mailpit";

/**
 * Scenario AUTH-001 (`.ai/qa/AUTH/AUTH-001-github-sign-in-links-a-confirmed-password-account.md`):
 * a GitHub sign-in whose verified primary email matches a confirmed email and password account links
 * GitHub to that account (accounts spec AD3, Flow 1 step 4.2). There is still one account, its
 * password still signs in, and its display name is kept.
 */
describe("GitHub linking to a password account (browser)", () => {
  const baseURL = inject("baseURL");
  const inbox = new MailpitInbox(inject("mailpitURL"));
  const browser = new IntegrationBrowser(`${inject("browserSession")}-link`, inject("integrationArtifactsDirectory"));
  const email = `link-${randomUUID().slice(0, 8)}@example.com`;
  const password = "a teapot on the windowsill";
  const githubId = 7_000_000 + Math.floor(Math.random() * 1_000_000);

  // Other scenarios count users, so this one removes its account (roles, sessions and links cascade)
  // and the limiter buckets its sign-up, confirmation and sign-in used.
  afterAll(async () => {
    try {
      await query("delete from users where email = $1", [email]);
      await query("delete from rate_limit_buckets");
    } finally {
      await browser.command("close");
    }
  });

  function post(path: string, body: unknown) {
    return fetch(new URL(path, baseURL), {
      method: "POST",
      headers: { "content-type": "application/json", "x-devmentor-csrf": "1" },
      body: JSON.stringify(body),
      redirect: "manual",
    });
  }

  function sessionCookie(response: Response): string {
    const header = response.headers.getSetCookie().find((value) => value.startsWith("devmentor_session="));
    expect(header).toBeDefined();
    return header!.split(";")[0]!;
  }

  /** Registers the address and confirms it with the password, through the real API and Mailpit. */
  async function confirmedPasswordAccount(): Promise<void> {
    const signUp = await post("/api/auth/sign-up", { displayName: "Ada Lovelace", email, password });
    expect(signUp.status).toBe(201);
    const link = linksIn((await inbox.waitForMessageTo(email)).Text).find((url) => url.pathname === "/confirm-email")!;
    const confirm = await post("/api/auth/confirm-email", { token: link.searchParams.get("token"), password });
    expect(confirm.status).toBe(200);
  }

  type AccountRow = { id: string; email: string; name: string; github_id: string | null; password_hash: string | null; email_confirmed_at: Date | null };
  const accountsFor = () => query<AccountRow>(
    "select id, email, name, github_id, password_hash, email_confirmed_at from users where lower(email) = $1 or github_id = $2",
    [email, String(githubId)]);

  it("links GitHub to a confirmed password account with the same verified email, keeping one account and its password", async () => {
    await confirmedPasswordAccount();
    const [before, ...others] = await accountsFor();
    expect(others).toEqual([]);
    expect(before).toMatchObject({ email, name: "Ada Lovelace", github_id: null });
    expect(before!.password_hash).not.toBeNull();
    expect(before!.email_confirmed_at).not.toBeNull();

    // GitHub reports the same address in another case, under another name, as its verified primary email.
    await setGitHubStubUser(inject("githubStubURL"), {
      id: githubId,
      login: `ada-${githubId}`,
      name: "Octo Ada",
      emails: [{ email: email.toUpperCase(), primary: true, verified: true }],
    });

    await browser.command("cookies", "clear");
    await browser.command("open", `${baseURL}/sign-in?returnTo=%2Faccount`);
    await browser.click("link", "Sign in with GitHub");
    await browser.waitForText("Authorize DevMentor");
    await browser.click("link", "Authorize");
    await browser.command("wait", "--url", `${baseURL}/account`);
    await browser.waitForText("GitHub, Email and password");

    // The existing account opens: its name, address and both sign-in methods, and no new-account notice.
    expect(await browser.value("Display name")).toBe("Ada Lovelace");
    const page = await browser.snapshot();
    expect(page).toContain(email);
    expect(page).toContain("mentee");
    expect(page).not.toContain("This is the name others see");
    await browser.capture("github-linked-account");

    // Still one account: GitHub is set on it, and the password, name and confirmation are unchanged.
    const after = await accountsFor();
    expect(after).toEqual([{ ...before!, github_id: String(githubId) }]);
    expect(await query("select role from user_roles where user_id = $1", [before!.id])).toEqual([{ role: "mentee" }]);

    // The password still signs in, to the same account, which now lists both methods.
    const signIn = await post("/api/auth/sign-in", { email, password });
    expect(signIn.status).toBe(200);
    const account = await fetch(new URL("/api/account", baseURL), { headers: { cookie: sessionCookie(signIn) } });
    expect((await account.json()).data).toMatchObject({
      id: before!.id, email, displayName: "Ada Lovelace", roles: ["mentee"], signInMethods: { github: true, password: true },
    });

    // Leave the browser session signed out.
    await browser.click("button", "Sign out");
    await browser.command("wait", "--url", `${baseURL}/`);
  });
});
