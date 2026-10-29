import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

import pg from "pg";
import { expect, inject } from "vitest";

import { setGitHubStubUser, STUB_DECISION_PARAM } from "./github-stub";
import { INTEGRATION_MAIL_FROM, linksIn, MailpitInbox } from "./mailpit";
import { runNpmResult, type NpmResult } from "./npm";

// Shared helpers of the mentor-invitation scenarios (E01 step 3.4): the real
// operator CLI with the app's mail settings, the invitation link as Mailpit
// received it, GitHub sessions over HTTP, lock-wait probes for the races and
// the "no raw token in evidence" check.

export const INVITATION_SUBJECT = "You're invited to mentor on DevMentor";

/** A database query on a short-lived client of the app's database. */
export async function query<T extends pg.QueryResultRow>(text: string, values: unknown[] = []): Promise<T[]> {
  const client = new pg.Client({ connectionString: inject("databaseURL") });
  await client.connect();
  try {
    return (await client.query<T>(text, values)).rows;
  } finally {
    await client.end();
  }
}

/**
 * `npm run operator -- <args> --yes` against the test database, with the
 * app's `APP_URL`, `SMTP_URL` and `MAIL_FROM` (explicit env wins over any
 * developer `.env*`). `smtpURL` overrides the mail server, e.g. to a closed
 * port for a failed delivery.
 */
export function operator(args: string[], { smtpURL = inject("smtpURL") }: { smtpURL?: string } = {}): Promise<NpmResult> {
  return runNpmResult(["operator", "--", ...args, "--yes"], inject("databaseURL"),
    join(inject("integrationArtifactsDirectory"), "operator.log"), {
      env: { APP_URL: inject("baseURL"), SMTP_URL: smtpURL, MAIL_FROM: INTEGRATION_MAIL_FROM },
      timeoutMs: 60_000,
    });
}

/** CLI output is status only: never a token, an invitation path or any URL (Flow 3 step 1). */
export function expectSecretFree(result: NpmResult, tokens: readonly string[] = []): void {
  const output = `${result.stdout}\n${result.stderr}`;
  expect(output).not.toMatch(/https?:\/\//);
  expect(output).not.toContain("/invite/");
  for (const token of tokens) expect(output).not.toContain(token);
}

/** The invitation tokens emailed to `email`, newest first, read from Mailpit. */
export async function invitationTokens(inbox: MailpitInbox, email: string): Promise<string[]> {
  const tokens: string[] = [];
  for (const summary of await inbox.messagesTo(email)) {
    if (summary.Subject !== INVITATION_SUBJECT) continue;
    const message = await inbox.message(summary.ID);
    for (const link of linksIn(message.Text)) {
      expect(link.origin).toBe(inject("baseURL"));
      const match = /^\/invite\/([^/]+)$/.exec(link.pathname);
      if (match) tokens.push(decodeURIComponent(match[1]!));
    }
  }
  return tokens;
}

/** Waits for the `count`-th invitation email to `email` and returns its token. */
export async function newestInvitationToken(inbox: MailpitInbox, email: string, count = 1): Promise<string> {
  const message = await inbox.waitForMessageTo(email, { count });
  expect(message.Subject).toBe(INVITATION_SUBJECT);
  expect(message.To.map((to) => to.Address)).toEqual([email]);
  const [token] = await invitationTokens(inbox, email);
  return token!;
}

/** The invitation page's server-rendered HTML for a session (or signed out). */
export async function invitationPage(token: string, cookie?: string): Promise<string> {
  const response = await fetch(`${inject("baseURL")}/invite/${token}`, { headers: cookie ? { cookie } : {} });
  expect(response.status).toBe(200);
  return response.text();
}

/** `POST /api/auth/invitations/accept` as the given session. */
export function postAccept(token: string, cookie: string): Promise<Response> {
  return fetch(`${inject("baseURL")}/api/auth/invitations/accept`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-devmentor-csrf": "1", cookie },
    body: JSON.stringify({ token }),
  });
}

export interface GitHubIdentity {
  id: number;
  email: string;
  name: string;
}

/**
 * A new session for a GitHub identity, signed in over HTTP through the stub
 * (no browser): start → authorize (answered without a click) → callback.
 * Returns the `cookie` header value and the raw session token.
 */
export async function githubSession(identity: GitHubIdentity): Promise<{ cookie: string; token: string }> {
  await setGitHubStubUser(inject("githubStubURL"), {
    id: identity.id, login: `gh-${identity.id}`, name: identity.name,
    emails: [{ email: identity.email, primary: true, verified: true }],
  });
  const started = await fetch(`${inject("baseURL")}/api/auth/github`, { redirect: "manual" });
  const oauth = started.headers.getSetCookie().find((value) => value.startsWith("devmentor_oauth="))!.split(";")[0]!;
  const authorize = new URL(started.headers.get("location")!);
  authorize.searchParams.set(STUB_DECISION_PARAM, "approve");
  const answered = await fetch(authorize, { redirect: "manual" });
  const callback = await fetch(answered.headers.get("location")!, { redirect: "manual", headers: { cookie: oauth } });
  expect(callback.status).toBe(303);
  const session = callback.headers.getSetCookie().find((value) => value.startsWith("devmentor_session="))!.split(";")[0]!;
  return { cookie: session, token: session.slice("devmentor_session=".length) };
}

/** The roles of the account with this address, sorted. */
export async function rolesOf(email: string): Promise<string[]> {
  const rows = await query<{ role: string }>(
    "select r.role from user_roles r join users u on u.id = r.user_id where u.email = $1 order by r.role", [email]);
  return rows.map((row) => row.role);
}

export interface InvitationRow {
  id: string;
  token_hash: string;
  consumed_at: Date | null;
  revoked_at: Date | null;
  accepted_by_user_id: string | null;
}

/** Every invitation row for the address, oldest first. */
export function invitationRows(email: string): Promise<InvitationRow[]> {
  return query<InvitationRow>(
    "select id, token_hash, consumed_at, revoked_at, accepted_by_user_id from mentor_invitations where email = $1 order by created_at", [email]);
}

/**
 * Polls until exactly `count` other backends of the app's database wait on a
 * lock (row, transaction id or unique-index entry). The race tests use it to
 * know that a request or CLI command has reached its blocking statement
 * before they start the next one or release the lock, instead of sleeping.
 */
export async function waitForLockWaiters(observer: pg.Client, count: number, timeoutMs = 45_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const { rows } = await observer.query<{ waiting: number }>(
      "select count(*)::int as waiting from pg_stat_activity where datname = current_database() and pid <> pg_backend_pid() and wait_event_type = 'Lock'");
    if (rows[0]!.waiting === count) return;
    if (rows[0]!.waiting > count) throw new Error(`Expected ${count} lock waiter(s), found ${rows[0]!.waiting}`);
    if (Date.now() > deadline) throw new Error(`Expected ${count} lock waiter(s) within ${timeoutMs} ms, found ${rows[0]!.waiting}`);
    await delay(50);
  }
}

/** A connected client on the app's database (lock holder or observer); end it when done. */
export async function connect(): Promise<pg.Client> {
  const client = new pg.Client({ connectionString: inject("databaseURL") });
  await client.connect();
  return client;
}

/**
 * Asserts that no text file of the run's evidence (browser log, snapshot
 * captures, CLI and server logs) contains any of the raw tokens. Screenshots
 * are skipped: the pages never render a token.
 */
export async function expectEvidenceFreeOf(tokens: readonly string[]): Promise<void> {
  const directory = inject("integrationArtifactsDirectory");
  expect(tokens.length).toBeGreaterThan(0);
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const name = entry.name;
    if (!entry.isFile() || name.endsWith(".png")) continue;
    const text = await readFile(join(directory, name), "utf8");
    for (const token of tokens) {
      expect(text.includes(token), `${name} contains a raw token`).toBe(false);
      expect(text.includes(encodeURIComponent(token)), `${name} contains an encoded raw token`).toBe(false);
    }
  }
}
