import { randomUUID } from "node:crypto";
import { appendFile } from "node:fs/promises";
import { join } from "node:path";

import pg from "pg";
import { afterAll, afterEach, describe, expect, inject, it } from "vitest";

import { IntegrationBrowser } from "./browser";
import { setGitHubStubBarrier, setGitHubStubUser, STUB_DECISION_PARAM } from "./github-stub";
import { runNpm } from "./npm";

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

  const githubStubURL = inject("githubStubURL");

  async function query<T extends pg.QueryResultRow>(text: string, values: unknown[] = []): Promise<T[]> {
    const client = new pg.Client({ connectionString: databaseURL });
    await client.connect();
    try {
      return (await client.query<T>(text, values)).rows;
    } finally {
      await client.end();
    }
  }

  /** The accessibility snapshot above the page's main landmark (the header). */
  async function headerLinks(): Promise<string> {
    return (await browser.snapshot()).split(/^\s*- main/m)[0]!;
  }

  async function sessionCookie() {
    return (await browser.cookies()).find((cookie) => cookie.name === "devmentor_session");
  }

  /** Signs in from a signed-out `/` through the GitHub stub's Authorize/Cancel screen. */
  async function signInWithGitHub(decision: "Authorize" | "Cancel") {
    await browser.command("open", `${baseURL}/`);
    await browser.click("link", "Sign in");
    await browser.waitForText("Sign in with GitHub");
    expect(await browser.url()).toBe(`${baseURL}/sign-in`);
    await browser.click("link", "Sign in with GitHub");
    await browser.waitForText("Authorize DevMentor");
    await browser.click("link", decision);
  }

  /** A request carrying the browser session's cookie, outside the browser. */
  async function fetchAsBrowser(path: string, init: RequestInit = {}): Promise<Response> {
    const cookie = await sessionCookie();
    if (!cookie) throw new Error("The browser session has no session cookie");
    return fetch(`${baseURL}${path}`, { ...init, redirect: "manual", headers: { ...init.headers, cookie: `${cookie.name}=${cookie.value}` } });
  }

  /** `npm run operator -- role <action>` against the test database (the real CLI). */
  async function operatorRole(action: "grant" | "revoke", email: string): Promise<string> {
    return runNpm(["operator", "--", "role", action, "--email", email, "--role", "operator", "--yes"],
      databaseURL, join(artifactsDirectory, "operator.log"));
  }

  // The admin cases run as an operator: a GitHub sign-in creates the account
  // (a mentee), `role grant` makes it an operator, and the same session opens
  // the backend on its next request. The account counts as a registered user.
  const operatorGitHubId = 4_000_000 + Math.floor(Math.random() * 1_000_000);
  const operatorEmail = `operator-${randomUUID()}@example.com`;

  it("renders the homepage with its title and visible content, and the header's sign-in state", async () => {
    await browser.command("cookies", "clear");
    await browser.command("open", baseURL);
    expect((await browser.command("get", "title")).title).toBe("DevMentor");
    expect(await browser.heading("DevMentor")).toBe("DevMentor");
    expect(await browser.visible("heading", "DevMentor")).toBe(true);
    expect(await browser.visible("link", "Sign in")).toBe(true);
    const homepage = await browser.snapshot();
    expect(homepage).toMatch(/AI Techleaders/i);
    expect(homepage).toMatch(/^\s*- main(?:\s|$)/m);
    expect(homepage).toContain("A project for tech leaders who use AI");
    // The backend is operator-only: the home page no longer links to it.
    expect(homepage).not.toMatch(/Open backend|Backend/);
  });

  it("keeps a signed-out visitor out of the backend: sign-in with returnTo, 401 from the API", async () => {
    await browser.command("open", `${baseURL}/backend`);
    await browser.waitForText("Sign in with GitHub");
    expect(await browser.url()).toBe(`${baseURL}/sign-in?returnTo=%2Fbackend`);
    expect(await browser.snapshot()).not.toContain("registered users");

    await browser.command("open", `${baseURL}/backend/users`);
    await browser.waitForText("Sign in with GitHub");
    expect(await browser.url()).toBe(`${baseURL}/sign-in?returnTo=%2Fbackend%2Fusers`);

    const api = await fetch(`${baseURL}/api/users`);
    expect(api.status).toBe(401);
    expect(await api.json()).toMatchObject({ ok: false, error: { code: "unauthorized" } });

    // A forged, well-formed cookie is renewed by the Proxy but grants nothing.
    const forged = "A".repeat(43);
    const page = await fetch(`${baseURL}/backend`, { redirect: "manual", headers: { cookie: `devmentor_session=${forged}` } });
    expect(page.status).toBe(307);
    // An unknown token looks like a deleted session, so sign-in says it expired (SM-AC2).
    expect(page.headers.get("location")).toMatch(/\/sign-in\?error=session_expired&returnTo=%2Fbackend$/);
    expect(page.headers.getSetCookie().some((value) => value.startsWith(`devmentor_session=${forged};`))).toBe(true);
    expect((await fetch(`${baseURL}/api/users`, { headers: { cookie: `devmentor_session=${forged}` } })).status).toBe(401);
  });

  it("answers a signed-in mentee with 404 on /backend and 403 on /api/users", async () => {
    await setGitHubStubUser(githubStubURL, {
      id: operatorGitHubId, login: `operator-${operatorGitHubId}`, name: "Olivia Operator",
      emails: [{ email: operatorEmail, primary: true, verified: true }],
    });
    await signInWithGitHub("Authorize");
    await browser.waitForText("This is the name others see. You can change it.");
    expect(await browser.snapshot()).toContain("mentee");
    expect(await headerLinks()).not.toContain("Backend");

    await browser.command("open", `${baseURL}/backend`);
    await browser.waitForText("Page not found");
    expect((await browser.command("get", "title")).title).toBe("Page not found · DevMentor");
    const notFound = await browser.snapshot();
    expect(notFound).not.toMatch(/Dashboard|registered users|View site/);
    expect(await browser.visible("link", "Go to the home page")).toBe(true);
    await browser.capture("backend-mentee-404");

    expect((await fetchAsBrowser("/backend")).status).toBe(404);
    expect((await fetchAsBrowser("/backend/users")).status).toBe(404);
    const api = await fetchAsBrowser("/api/users");
    expect(api.status).toBe(403);
    expect(await api.json()).toMatchObject({ ok: false, error: { code: "forbidden" } });
  });

  it("opens the backend to the same session after npm run operator -- role grant", async () => {
    const output = await operatorRole("grant", operatorEmail);
    expect(output).toContain(`Database: ${new URL(databaseURL).host}`);
    expect(output).toContain(`Granted operator to ${operatorEmail}.`);
    // Idempotent: a second grant changes nothing.
    expect(await operatorRole("grant", operatorEmail)).toContain(`${operatorEmail} already holds operator; nothing changed.`);

    // The same session, on its next request: the header offers Backend.
    await browser.command("open", baseURL);
    await browser.waitForText("A project for tech leaders");
    expect(await browser.visible("link", "Backend")).toBe(true);
    await browser.click("link", "Backend");
    await browser.waitForText("1 registered users");
    expect(await browser.url()).toBe(`${baseURL}/backend`);
    expect((await fetchAsBrowser("/api/users")).status).toBe(200);
  });

  it("renders the admin page directly with its title, navigation, and connected database", async () => {
    await browser.command("open", `${baseURL}/backend`);
    await browser.waitForText("1 registered users");
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
    expect(dashboard).toContain("1 registered users");
    expect(dashboard).not.toContain("Unavailable");
    await browser.capture("admin-operator-only");

    await browser.click("link", "View site");
    await browser.waitForText("A project for tech leaders");
    expect((await browser.command("get", "url")).url).toBe(`${baseURL}/`);
    expect(await browser.heading("DevMentor")).toBe("DevMentor");
  });

  it("validates input, creates a user, persists it on reload, and rejects duplicate email", async () => {
    await browser.command("open", `${baseURL}/backend/users`);
    // The operator's own account is the only user so far.
    await browser.waitForText(operatorEmail);
    expect((await browser.command("get", "title")).title).toBe("Users · DevMentor");
    expect(await browser.heading("Users")).toBe("Users");
    expect(await browser.snapshot()).toContain('cell "Olivia Operator"');

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
    expect(await browser.snapshot()).toContain("2 registered users");
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
    // Identity-free even for a signed-in operator.
    expect(page).not.toMatch(/Sign in|Sign out|Backend|Olivia Operator/);
    expect(await browser.visible("link", "DevMentor")).toBe(true);

    await browser.click("link", "Go to the home page");
    await browser.waitForText("A project for tech leaders");
    expect((await browser.command("get", "url")).url).toBe(`${baseURL}/`);
  });

  // Keep after the exact-count cases: it adds the sample user to the container shared by every
  // integration file (one globalSetup), and earlier cases assert exact user
  // counts. A new integration file must not assume an empty users table.
  it("seeds the sample user idempotently with npm run db:seed", async () => {
    const seedLog = join(artifactsDirectory, "seed.log");
    await runNpm(["db:seed"], databaseURL, seedLog);
    await runNpm(["db:seed"], databaseURL, seedLog);

    await browser.command("open", `${baseURL}/backend/users`);
    await browser.waitForText("ada@devmentor.dev");
    const users = await browser.snapshot();
    expect(users).toContain('cell "Ada Lovelace"');
    expect(users.split('cell "ada@devmentor.dev"').length - 1).toBe(1);
    await browser.capture("users-seeded");

    await browser.command("open", `${baseURL}/backend`);
    expect(await browser.heading("Dashboard")).toBe("Dashboard");
    expect(await browser.snapshot()).toContain("3 registered users");
  });

  it("sends an operator whose session expired on /backend/users to sign-in, then back (SM-AC2)", async () => {
    await browser.command("open", `${baseURL}/backend/users`);
    await browser.waitForText(operatorEmail);
    const [operator] = await query<{ id: string }>("select id from users where email = $1", [operatorEmail]);
    await query("update auth_sessions set expires_at = now() - interval '1 minute' where user_id = $1", [operator!.id]);

    // An API write with the expired session: full navigation to sign-in, nothing is created.
    const email = `expired-${randomUUID()}@example.com`;
    await browser.fill("Name", "Never Created");
    await browser.fill("Email", email);
    await browser.click("button", "Create user");
    await browser.waitForText("Your session expired.");
    expect(await browser.url()).toBe(`${baseURL}/sign-in?error=session_expired&returnTo=%2Fbackend%2Fusers`);
    expect(await browser.snapshot()).toContain("Sign in again.");
    expect(await query("select id from users where email = $1", [email])).toEqual([]);
    expect(await query("select id from auth_sessions where user_id = $1", [operator!.id])).toEqual([]);
    await browser.capture("backend-users-session-expired");

    // Signing in again returns to the users page with a fresh session.
    await browser.click("link", "Sign in with GitHub");
    await browser.waitForText("Authorize DevMentor");
    await browser.click("link", "Authorize");
    await browser.command("wait", "--url", `${baseURL}/backend/users`);
    await browser.waitForText(operatorEmail);
    expect(await browser.snapshot()).not.toContain(email);
  });

  it("closes the backend to the same session after role revoke, which stays signed in", async () => {
    const output = await operatorRole("revoke", operatorEmail);
    expect(output).toContain(`Revoked operator from ${operatorEmail}.`);

    // Next request: 404 page, 403 API; the session itself is untouched.
    await browser.command("open", `${baseURL}/backend`);
    await browser.waitForText("Page not found");
    expect(await browser.snapshot()).not.toContain("registered users");
    expect((await fetchAsBrowser("/backend")).status).toBe(404);
    const api = await fetchAsBrowser("/api/users");
    expect(api.status).toBe(403);
    expect(await api.json()).toMatchObject({ ok: false, error: { code: "forbidden" } });

    await browser.command("open", baseURL);
    await browser.waitForText("A project for tech leaders");
    expect(await browser.visible("link", "Olivia Operator")).toBe(true);
    expect(await browser.visible("button", "Sign out")).toBe(true);
    expect(await headerLinks()).not.toContain("Backend");
    const [operator] = await query<{ id: string }>("select id from users where email = $1", [operatorEmail]);
    expect(await query("select role from user_roles where user_id = $1", [operator!.id])).toEqual([{ role: "mentee" }]);
    expect(await query("select id from auth_sessions where user_id = $1", [operator!.id])).toHaveLength(1);
    await browser.capture("backend-revoked-signed-in");

    // Leave the shared browser session signed out.
    await browser.click("button", "Sign out");
    await browser.command("wait", "--url", `${baseURL}/`);
    await browser.waitForText("Sign in");
  });

  // GitHub sign-in backend (accounts Phase 1 step 8), driven over HTTP
  // against the local GitHub stub. These cases add users, so they run after
  // every case that asserts exact user counts.
  describe("GitHub sign-in through the stub", () => {
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
    const githubId = 3_000_000 + Math.floor(Math.random() * 1_000_000);
    const email = `grace-${randomUUID()}@example.com`;

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

    it("redirects a signed-in /sign-in (SM-AC1); says the session expired, keeps returnTo and discards an unsaved name (SM-AC2)", async () => {
      const [user] = await query<{ id: string }>("select id from users where github_id = $1", [String(githubId)]);
      const expire = () => query("update auth_sessions set expires_at = now() - interval '1 minute' where user_id = $1", [user!.id]);
      await signInWithGitHub("Authorize");
      await browser.command("wait", "--url", `${baseURL}/`);

      // A page request with an expired session: the guard redirects with the banner.
      await expire();
      await browser.command("open", `${baseURL}/account`);
      await browser.waitForText("Your session expired.");
      expect(await browser.url()).toBe(`${baseURL}/sign-in?error=session_expired&returnTo=%2Faccount`);
      expect(await browser.snapshot()).toContain("Sign in again.");
      expect(await headerLinks()).not.toContain("Sign out");
      await browser.capture("session-expired-page");

      // Signing in again returns to /account.
      await browser.click("link", "Sign in with GitHub");
      await browser.waitForText("Authorize DevMentor");
      await browser.click("link", "Authorize");
      await browser.command("wait", "--url", `${baseURL}/account`);
      await browser.waitForText(email);

      // Signed in, /sign-in goes to the safe returnTo, otherwise to / (SM-AC1).
      await browser.command("open", `${baseURL}/sign-in?returnTo=%2Faccount`);
      await browser.command("wait", "--url", `${baseURL}/account`);
      await browser.waitForText(email);
      await browser.command("open", `${baseURL}/sign-in?returnTo=https%3A%2F%2Fevil.example`);
      await browser.command("wait", "--url", `${baseURL}/`);
      await browser.command("open", `${baseURL}/account`);
      await browser.waitForText(email);

      // An API write with an expired session: full navigation to sign-in, the name is not saved.
      await expire();
      await browser.fill("Display name", "Unsaved Name");
      await browser.click("button", "Save name");
      await browser.waitForText("Your session expired.");
      expect(await browser.url()).toBe(`${baseURL}/sign-in?error=session_expired&returnTo=%2Faccount`);
      expect(await query("select name from users where id = $1", [user!.id])).toEqual([{ name: "Grace B. Hopper" }]);
      expect(await query("select id from auth_sessions where user_id = $1", [user!.id])).toEqual([]);
      await browser.command("cookies", "clear");
    });
  });
});
