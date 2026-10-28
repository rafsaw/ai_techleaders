import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { appendFile } from "node:fs/promises";
import { join } from "node:path";

import pg from "pg";
import { afterAll, afterEach, describe, expect, inject, it } from "vitest";

import { IntegrationBrowser } from "./browser";
import { repositoryRoot } from "./context";
import { setGitHubStubBarrier, setGitHubStubUser, STUB_DECISION_PARAM } from "./github-stub";

/**
 * Runs `npm run db:seed` against the test container. Settles on "close" (stdio
 * drained) so the log is never ended under a late write; on timeout it kills the
 * process group and waits for it to close before rejecting.
 */
async function runSeed(databaseURL: string, logPath: string): Promise<void> {
  const log = createWriteStream(logPath, { flags: "a" });
  const seed = spawn("npm", ["run", "db:seed"], {
    cwd: repositoryRoot,
    env: { ...process.env, NODE_ENV: "production", DATABASE_URL: databaseURL, DB_DEBUG: "false" },
    detached: process.platform !== "win32",
    stdio: ["ignore", "pipe", "pipe"],
  });
  seed.stdout.pipe(log, { end: false });
  seed.stderr.pipe(log, { end: false });
  try {
    await new Promise<void>((resolve, reject) => {
      let timedOut = false;
      const timeout = setTimeout(() => {
        timedOut = true;
        if (process.platform !== "win32" && seed.pid) process.kill(-seed.pid, "SIGKILL");
        else seed.kill("SIGKILL");
      }, 30_000);
      seed.once("error", (error) => { clearTimeout(timeout); reject(error); });
      seed.once("close", (code, signal) => {
        clearTimeout(timeout);
        if (timedOut) reject(new Error(`db:seed did not finish in 30 seconds; see ${logPath}`));
        else if (code === 0) resolve();
        else reject(new Error(`db:seed failed (${code ?? signal}); see ${logPath}`));
      });
    });
  } finally {
    log.end();
  }
}

describe("production application with ephemeral PostgreSQL", () => {
  const baseURL = inject("baseURL");
  const databaseURL = inject("databaseURL");
  const artifactsDirectory = inject("integrationArtifactsDirectory");
  const browser = new IntegrationBrowser(inject("browserSession"), artifactsDirectory);

  afterEach(async ({ task }) => {
    // Keep both passing checkpoints and failure evidence for CI artifact review.
    try {
      await browser.capture(task.name);
    } catch (error) {
      await appendFile(join(artifactsDirectory, "capture.log"), `${task.name}: ${String(error)}\n`);
    }
  });

  afterAll(async () => {
    await browser.command("close");
  });

  it("renders the homepage with its title, visible content, and admin navigation", async () => {
    await browser.command("open", baseURL);
    expect((await browser.command("get", "title")).title).toBe("DevMentor");
    expect(await browser.heading("DevMentor")).toBe("DevMentor");
    expect(await browser.visible("heading", "DevMentor")).toBe(true);
    expect(await browser.visible("link", "Open backend")).toBe(true);
    const homepage = await browser.snapshot();
    expect(homepage).toMatch(/AI Techleaders/i);
    expect(homepage).toMatch(/^\s*- main(?:\s|$)/m);
    expect(homepage).toContain("A project for tech leaders who use AI");

    await browser.click("link", "Open backend");
    await browser.waitForText("0 registered users");
    expect((await browser.command("get", "url")).url).toBe(`${baseURL}/backend`);
  });

  it("renders the admin page directly with its title, navigation, and connected database", async () => {
    await browser.command("open", `${baseURL}/backend`);
    await browser.waitForText("0 registered users");
    expect((await browser.command("get", "title")).title).toBe("Dashboard · DevMentor");
    expect(await browser.heading("Dashboard")).toBe("Dashboard");
    expect(await browser.visible("heading", "Dashboard")).toBe(true);
    expect(await browser.visible("link", "Users")).toBe(true);
    expect(await browser.visible("link", "View site")).toBe(true);
    const dashboard = await browser.snapshot();
    expect(dashboard).toMatch(/^\s*- banner(?:\s|$)/m);
    expect(dashboard).toMatch(/^\s*- navigation(?:\s|$)/m);
    expect(dashboard).toMatch(/^\s*- main(?:\s|$)/m);
    expect(dashboard).toContain("PostgreSQL via MikroORM");
    expect(dashboard).toContain("Connected");
    expect(dashboard).toContain("0 registered users");
    expect(dashboard).not.toContain("Unavailable");
    await browser.capture("admin-empty");

    await browser.click("link", "View site");
    await browser.waitForText("A project for tech leaders");
    expect((await browser.command("get", "url")).url).toBe(`${baseURL}/`);
    expect(await browser.heading("DevMentor")).toBe("DevMentor");
  });

  it("validates input, creates a user, persists it on reload, and rejects duplicate email", async () => {
    await browser.command("open", `${baseURL}/backend/users`);
    await browser.waitForText("No users yet");
    expect((await browser.command("get", "title")).title).toBe("Users · DevMentor");
    expect(await browser.heading("Users")).toBe("Users");
    expect(await browser.snapshot()).toContain("Create the first one with the form.");

    await browser.click("button", "Create user");
    await browser.waitForText("Name is required");
    const validation = await browser.snapshot();
    expect(validation).toContain("Name is required");
    expect(validation).toContain("Enter a valid email address");
    await browser.capture("users-validation");

    const email = `integration-${randomUUID()}@example.com`;
    await browser.fill("Name", "Integration User");
    await browser.fill("Email", email);
    await browser.click("button", "Create user");
    await browser.waitForText(email);
    const created = await browser.snapshot();
    expect(created).toContain('cell "Integration User"');
    expect(created).toContain(`cell "${email}"`);
    expect(created).not.toContain("No users yet");
    expect(created).not.toContain("Name is required");
    await browser.capture("users-created");

    await browser.command("reload");
    await browser.waitForText(email);
    expect(await browser.snapshot()).toContain(`cell "${email}"`);

    await browser.fill("Name", "Duplicate User");
    // Exercise the shared schema's normalization and the actual unique index.
    await browser.fill("Email", email.toUpperCase());
    await browser.click("button", "Create user");
    await browser.waitForText("A user with this email already exists");
    const duplicate = await browser.snapshot();
    expect(duplicate).toContain("Could not save");
    expect(duplicate).toContain("A user with this email already exists");
    expect(duplicate.split(`cell "${email}"`).length - 1).toBe(1);
    await browser.capture("users-duplicate");

    await browser.command("open", `${baseURL}/backend`);
    expect(await browser.heading("Dashboard")).toBe("Dashboard");
    expect(await browser.snapshot()).toContain("1 registered users");
  });

  it("renders the identity-free /error screen with a generic message and a way home", async () => {
    await browser.command("open", `${baseURL}/error?code=internal_error`);
    await browser.waitForText("Something went wrong");
    expect((await browser.command("get", "title")).title).toBe("Something went wrong · DevMentor");
    expect(await browser.heading("Something went wrong")).toBe("Something went wrong");
    const page = await browser.snapshot();
    expect(page).toMatch(/^\s*- banner(?:\s|$)/m);
    expect(page).toMatch(/^\s*- main(?:\s|$)/m);
    expect(page).toContain("We couldn't complete your request. Please try again in a moment.");
    expect(page).not.toContain("internal_error");
    expect(page).not.toMatch(/Sign in|Sign out|Backend/);
    expect(await browser.visible("link", "DevMentor")).toBe(true);

    await browser.click("link", "Go to the home page");
    await browser.waitForText("A project for tech leaders");
    expect((await browser.command("get", "url")).url).toBe(`${baseURL}/`);
  });

  // Keep after the empty-state cases: it adds the sample user to the container shared by every
  // integration file (one globalSetup), and earlier cases assert the empty
  // state and exact user counts. A new integration file must not assume an
  // empty users table once this case has run.
  it("seeds the sample user idempotently with npm run db:seed", async () => {
    const seedLog = join(artifactsDirectory, "seed.log");
    await runSeed(databaseURL, seedLog);
    await runSeed(databaseURL, seedLog);

    await browser.command("open", `${baseURL}/backend/users`);
    await browser.waitForText("ada@devmentor.dev");
    const users = await browser.snapshot();
    expect(users).toContain('cell "Ada Lovelace"');
    expect(users.split('cell "ada@devmentor.dev"').length - 1).toBe(1);
    await browser.capture("users-seeded");

    await browser.command("open", `${baseURL}/backend`);
    expect(await browser.heading("Dashboard")).toBe("Dashboard");
    expect(await browser.snapshot()).toContain("2 registered users");
  });
  // GitHub sign-in backend (accounts Phase 1 step 8), driven over HTTP
  // against the local GitHub stub. These cases add users, so they run after
  // every case that asserts exact user counts.
  describe("GitHub sign-in through the stub", () => {
    const githubStubURL = inject("githubStubURL");

    /** Follows start → stub authorize (answered without a click) and returns the callback request. */
    async function beginSignIn(decision: "approve" | "deny", returnTo?: string) {
      const query = returnTo === undefined ? "" : `?returnTo=${encodeURIComponent(returnTo)}`;
      const started = await fetch(`${baseURL}/api/auth/github${query}`, { redirect: "manual" });
      expect(started.status).toBe(303);
      const cookie = started.headers.getSetCookie().find((value) => value.startsWith("devmentor_oauth="));
      expect(cookie).toBeDefined();
      const authorize = new URL(started.headers.get("location")!);
      expect(authorize.origin).toBe(githubStubURL);
      authorize.searchParams.set(STUB_DECISION_PARAM, decision);
      const answered = await fetch(authorize, { redirect: "manual" });
      expect(answered.status).toBe(302);
      const callback = answered.headers.get("location")!;
      expect(callback.startsWith(`${baseURL}/api/auth/github/callback?`)).toBe(true);
      return { callback, cookie: cookie!.split(";")[0]! };
    }

    function finish({ callback, cookie }: { callback: string; cookie: string }) {
      return fetch(callback, { redirect: "manual", headers: { cookie } });
    }

    function clearsOAuthCookie(response: Response): boolean {
      return response.headers.getSetCookie().some((value) => value.startsWith("devmentor_oauth=;") && /Max-Age=0/.test(value));
    }

    it("returns a cancelled sign-in to /sign-in with its returnTo and creates no session", async () => {
      const response = await finish(await beginSignIn("deny", "/mentors?page=2"));
      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toBe(`${baseURL}/sign-in?error=github_cancelled&returnTo=%2Fmentors%3Fpage%3D2`);
      expect(clearsOAuthCookie(response)).toBe(true);
      expect(response.headers.getSetCookie().some((value) => value.startsWith("devmentor_session="))).toBe(false);
    });

    it("creates exactly one account when concurrent callbacks for one GitHub identity race (#34 AC 3)", async () => {
      const githubId = 2_000_000 + Math.floor(Math.random() * 1_000_000);
      const email = `race-${randomUUID()}@example.com`;
      await setGitHubStubUser(githubStubURL, {
        id: githubId,
        login: `racer-${githubId}`,
        name: "Race Condition",
        emails: [{ email: email.toUpperCase(), primary: true, verified: true }],
      });
      // The stub releases all identity lookups together, so the callbacks
      // resolve the account concurrently and the unique constraints decide.
      const attempts = await Promise.all(Array.from({ length: 4 }, () => beginSignIn("approve")));
      await setGitHubStubBarrier(githubStubURL, attempts.length);
      const responses = await Promise.all(attempts.map(finish));

      for (const response of responses) {
        expect(response.status).toBe(303);
        expect(clearsOAuthCookie(response)).toBe(true);
        expect(response.headers.getSetCookie().some((value) => /^devmentor_session=[A-Za-z0-9_-]{43};/.test(value))).toBe(true);
      }
      // One callback created the account; the others reused it.
      expect(responses.map((response) => response.headers.get("location")).sort())
        .toEqual([`${baseURL}/`, `${baseURL}/`, `${baseURL}/`, `${baseURL}/account?welcome=1`]);

      const client = new pg.Client({ connectionString: databaseURL });
      await client.connect();
      try {
        const users = await client.query<{ id: string; email: string; name: string; email_confirmed_at: Date | null }>(
          "select id, email, name, email_confirmed_at from users where github_id = $1", [String(githubId)]);
        expect(users.rows).toHaveLength(1);
        expect(users.rows[0]).toMatchObject({ email, name: "Race Condition" });
        expect(users.rows[0]!.email_confirmed_at).not.toBeNull();
        const roles = await client.query("select role from user_roles where user_id = $1", [users.rows[0]!.id]);
        expect(roles.rows).toEqual([{ role: "mentee" }]);
        const sessions = await client.query("select count(*)::int as count from auth_sessions where user_id = $1", [users.rows[0]!.id]);
        expect(sessions.rows[0]).toEqual({ count: 4 });
      } finally {
        await client.end();
      }
    });
  });

  // Accounts UI (accounts Phase 1 step 9) in the browser, through the GitHub
  // stub's Authorize/Cancel screen. The steps share one browser session and
  // run in order: signed out → signed in → signed out → signed in again.
  describe("accounts UI: GitHub sign-in, account and sign-out", () => {
    const githubStubURL = inject("githubStubURL");
    const githubId = 3_000_000 + Math.floor(Math.random() * 1_000_000);
    const email = `grace-${randomUUID()}@example.com`;

    async function query<T extends pg.QueryResultRow>(text: string, values: unknown[] = []): Promise<T[]> {
      const client = new pg.Client({ connectionString: databaseURL });
      await client.connect();
      try {
        return (await client.query<T>(text, values)).rows;
      } finally {
        await client.end();
      }
    }

    async function headerLinks(): Promise<string> {
      return (await browser.snapshot()).split(/^\s*- main/m)[0]!;
    }

    async function sessionCookie() {
      return (await browser.cookies()).find((cookie) => cookie.name === "devmentor_session");
    }

    /** Polls until the session's DB expiry is at least `minimumMs` from now. */
    async function expectExpiryAdvanced(userId: string, minimumMs: number): Promise<void> {
      const deadline = Date.now() + 10_000;
      for (;;) {
        const [row] = await query<{ remaining_ms: number }>(
          "select extract(epoch from (max(expires_at) - now())) * 1000 as remaining_ms from auth_sessions where user_id = $1", [userId]);
        if (Number(row!.remaining_ms) >= minimumMs) return;
        if (Date.now() > deadline) throw new Error(`DB expiry did not advance (${row!.remaining_ms} ms left)`);
        await browser.command("wait", "250");
      }
    }

    /** Moves the session's DB expiry back to 29 days, outside the one-hour throttle. */
    function ageSession(userId: string) {
      return query("update auth_sessions set expires_at = now() + interval '29 days' where user_id = $1", [userId]);
    }

    const DAY_MS = 24 * 60 * 60 * 1000;

    async function signInWithGitHub(decision: "Authorize" | "Cancel") {
      await browser.command("open", `${baseURL}/`);
      await browser.click("link", "Sign in");
      await browser.waitForText("Sign in with GitHub");
      expect(await browser.url()).toBe(`${baseURL}/sign-in`);
      await browser.click("link", "Sign in with GitHub");
      await browser.waitForText("Authorize DevMentor");
      await browser.click("link", decision);
    }

    it("keeps a signed-out visitor out of /account with returnTo", async () => {
      await browser.command("cookies", "clear");
      await browser.command("open", `${baseURL}/account`);
      await browser.waitForText("Sign in with GitHub");
      expect(await browser.url()).toBe(`${baseURL}/sign-in?returnTo=%2Faccount`);
      expect(await browser.heading("Sign in")).toBe("Sign in");
    });

    it("shows the cancelled banner after GitHub is denied and stays signed out", async () => {
      await setGitHubStubUser(githubStubURL, {
        id: githubId, login: `grace-${githubId}`, name: "Grace Hopper",
        emails: [{ email, primary: true, verified: true }],
      });
      await signInWithGitHub("Cancel");
      await browser.waitForText("GitHub sign-in was cancelled.");
      expect(await browser.url()).toBe(`${baseURL}/sign-in?error=github_cancelled`);
      expect(await browser.snapshot()).toContain("Try again");
      expect(await browser.visible("link", "Sign in")).toBe(true);
      expect(await headerLinks()).not.toContain("Sign out");
      expect(await sessionCookie()).toBeUndefined();
      expect(await query("select id from users where github_id = $1", [String(githubId)])).toEqual([]);
    });

    it("signs in with GitHub and lands on /account?welcome=1 showing the GitHub name once", async () => {
      await signInWithGitHub("Authorize");
      await browser.waitForText("This is the name others see. You can change it.");
      expect((await browser.command("get", "title")).title).toBe("Account · DevMentor");
      expect(await browser.value("Display name")).toBe("Grace Hopper");
      expect(await browser.visible("link", "Grace Hopper")).toBe(true);
      expect(await browser.visible("button", "Sign out")).toBe(true);
      const page = await browser.snapshot();
      expect(page).toContain(email);
      expect(page).toContain("mentee");
      expect(page).toContain("GitHub");
      // The one-time flag is dropped from the address once shown…
      await browser.command("wait", "--fn", "location.pathname === '/account' && location.search === ''");
      expect(await browser.url()).toBe(`${baseURL}/account`);
      await browser.capture("account-welcome");
      // …so a reload does not show the notice again (SM-AC7).
      await browser.command("reload");
      await browser.waitForText(email);
      expect(await browser.snapshot()).not.toContain("This is the name others see");
      expect(await sessionCookie()).toMatchObject({ value: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/) });
    });

    it("saves a new display name, keeps it in the field and persists it", async () => {
      // Spaces only: trimmed to empty by the shared schema.
      await browser.fill("Display name", "   ");
      await browser.click("button", "Save name");
      await browser.waitForText("Display name is required");
      await browser.fill("Display name", "Grace B. Hopper");
      await browser.click("button", "Save name");
      await browser.waitForText("Name saved");
      expect(await browser.value("Display name")).toBe("Grace B. Hopper");
      // The header refreshes with the saved name.
      await browser.command("wait", "--text", "Grace B. Hopper");
      await browser.command("wait", "--fn", "[...document.querySelectorAll('header a')].some((a) => a.textContent === 'Grace B. Hopper')");
      await browser.capture("account-name-saved");
      expect(await query("select name from users where github_id = $1", [String(githubId)])).toEqual([{ name: "Grace B. Hopper" }]);

      await browser.command("reload");
      await browser.waitForText(email);
      expect(await browser.value("Display name")).toBe("Grace B. Hopper");
    });

    it("renews the cookie on page navigations and advances DB expiry once the throttle window passed", async () => {
      const [user] = await query<{ id: string }>("select id from users where github_id = $1", [String(githubId)]);
      await browser.command("open", `${baseURL}/`);
      await browser.waitForText("A project for tech leaders");

      // Public to public: the brand link from / to / (client navigation).
      await ageSession(user!.id);
      const before = (await sessionCookie())!.expires;
      await browser.command("wait", "1100");
      await browser.click("link", "DevMentor");
      await expectExpiryAdvanced(user!.id, 30 * DAY_MS - 60_000);
      expect((await sessionCookie())!.expires).toBeGreaterThan(before);

      // Into the signed-in area, then a page-only navigation inside it.
      await browser.click("link", "Grace B. Hopper");
      await browser.waitForText(email);
      expect(await browser.url()).toBe(`${baseURL}/account`);
      await ageSession(user!.id);
      const renewed = (await sessionCookie())!.expires;
      await browser.command("wait", "1100");
      await browser.click("link", "Grace B. Hopper");
      await expectExpiryAdvanced(user!.id, 30 * DAY_MS - 60_000);
      expect((await sessionCookie())!.expires).toBeGreaterThan(renewed);
    });

    it("stays on the page with an error when sign-out fails", async () => {
      // Offline, the sign-out request fails before reaching the server.
      await browser.command("set", "offline", "on");
      try {
        await browser.click("button", "Sign out");
        await browser.waitForText("Could not sign out. Try again.");
      } finally {
        await browser.command("set", "offline", "off");
      }
      expect(await browser.url()).toBe(`${baseURL}/account`);
      expect(await browser.visible("link", "Grace B. Hopper")).toBe(true);
      await browser.capture("sign-out-failed");
      expect(await sessionCookie()).toBeDefined();
    });

    it("signs out with a full navigation to / and the header shows Sign in", async () => {
      const [user] = await query<{ id: string }>("select id from users where github_id = $1", [String(githubId)]);
      await browser.click("button", "Sign out");
      await browser.command("wait", "--url", `${baseURL}/`);
      await browser.waitForText("A project for tech leaders");
      expect(await browser.visible("link", "Sign in")).toBe(true);
      expect(await headerLinks()).not.toContain("Grace B. Hopper");
      expect(await sessionCookie()).toBeUndefined();
      expect(await query("select id from auth_sessions where user_id = $1", [user!.id])).toEqual([]);
    });

    it("signs in again with the same GitHub account without creating a duplicate", async () => {
      await signInWithGitHub("Authorize");
      await browser.command("wait", "--url", `${baseURL}/`);
      await browser.waitForText("Grace B. Hopper");
      // The edited name is kept: GitHub's name never overwrites it.
      expect(await browser.visible("link", "Grace B. Hopper")).toBe(true);
      const users = await query<{ name: string }>("select name from users where github_id = $1 or email = $2", [String(githubId), email]);
      expect(users).toEqual([{ name: "Grace B. Hopper" }]);

      await browser.click("link", "Grace B. Hopper");
      await browser.waitForText(email);
      expect(await browser.snapshot()).not.toContain("This is the name others see");
      // Leave the shared browser session signed out.
      await browser.click("button", "Sign out");
      await browser.command("wait", "--url", `${baseURL}/`);
    });
  });
});
