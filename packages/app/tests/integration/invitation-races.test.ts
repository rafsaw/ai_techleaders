import { randomUUID } from "node:crypto";

import type pg from "pg";
import { afterAll, afterEach, beforeEach, describe, expect, inject, it } from "vitest";

import {
  connect,
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
  waitForLockWaiters,
} from "./invitations";
import { MailpitInbox } from "./mailpit";

/**
 * The four real-DB invitation races (E01 Flow 3 step 3, step 3.4). Each one
 * forces its interleaving instead of hoping for it: a separate client holds
 * the contested row lock (or an uncommitted open row), the contenders start
 * one by one, `waitForLockWaiters` confirms each has reached its blocking
 * statement, and only then is the holder released. PostgreSQL wakes row-lock
 * waiters in arrival order, so "who wins" is the order they were started in.
 *
 * - two matching sessions accept one invitation: one 200, one 404;
 * - accept vs revoke, and accept vs resend, each in both orders: when the
 *   operator command wins the old link cannot grant; when acceptance wins the
 *   command does not take the role back;
 * - two concurrent `invite create` for one address: the partial unique open
 *   index lets one through and the other gets the create conflict.
 *
 * The app runs with `DB_POOL_MAX=2`; at most two requests wait at once.
 */
describe("mentor invitation races (PostgreSQL)", () => {
  const inbox = new MailpitInbox(inject("mailpitURL"));
  const suffix = randomUUID().slice(0, 8);
  const seed = 6_000_000 + Math.floor(Math.random() * 1_000_000);
  let next = 0;
  const addresses: string[] = [];
  const seenTokens: string[] = [];
  let holder: pg.Client;
  let observer: pg.Client;

  beforeEach(async () => {
    holder = await connect();
    observer = await connect();
  });

  afterEach(async () => {
    // A failed case may leave the holder's transaction open: ending the client rolls it back.
    await holder.end();
    await observer.end();
  });

  afterAll(async () => {
    await query("delete from mentor_invitations where email = any($1)", [addresses]);
    await query("delete from users where email = any($1)", [addresses]);
  });

  function address(label: string): string {
    const email = `race-${label}-${suffix}@example.com`;
    addresses.push(email);
    return email;
  }

  /** A GitHub account for a fresh address and one session for it. */
  async function invitee(label: string) {
    const email = address(label);
    const identity = { id: seed + next++, email, name: `Racer ${label}` };
    return { email, identity, ...(await githubSession(identity)) };
  }

  /** `invite create` through the real CLI; the emailed token. */
  async function create(email: string): Promise<string> {
    const result = await operator(["invite", "create", "--email", email]);
    expect(result.code).toBe(0);
    const token = await newestInvitationToken(inbox, email);
    seenTokens.push(token);
    expectSecretFree(result, [token]);
    return token;
  }

  /** Locks the address's open invitation row in the holder's transaction. */
  async function holdOpenInvitation(email: string): Promise<void> {
    await holder.query("begin");
    const { rowCount } = await holder.query(
      "select id from mentor_invitations where email = $1 and consumed_at is null and revoked_at is null for update", [email]);
    expect(rowCount).toBe(1);
  }

  async function mentorGrants(email: string): Promise<number> {
    const [row] = await query<{ count: number }>(
      "select count(*)::int as count from user_roles r join users u on u.id = r.user_id where u.email = $1 and r.role = 'mentor'", [email]);
    return row!.count;
  }

  it("two matching sessions accept one invitation: exactly one grant", async () => {
    const first = await invitee("double");
    const second = await githubSession(first.identity);
    expect(second.token).not.toBe(first.token);
    const token = await create(first.email);

    // Both requests wait on the user row, the first lock acceptance takes.
    await holder.query("begin");
    await holder.query("select id from users where email = $1 for update", [first.email]);
    const accepts = [postAccept(token, first.cookie), postAccept(token, second.cookie)];
    await waitForLockWaiters(observer, 2);
    await holder.query("commit");
    const responses = await Promise.all(accepts);

    expect(responses.map((response) => response.status).sort()).toEqual([200, 404]);
    const winner = responses.find((response) => response.status === 200)!;
    const body = await winner.json();
    expect(body.ok).toBe(true);
    expect(body.data.roles).toContain("mentor");
    // No rotation: the response renews the same session token (P3).
    const winnerToken = winner === responses[0] ? first.token : second.token;
    expect(winner.headers.getSetCookie().filter((value) => value.startsWith("devmentor_session=")))
      .toEqual([expect.stringMatching(new RegExp(`^devmentor_session=${winnerToken};`))]);
    const loser = await responses.find((response) => response.status === 404)!.json();
    expect(loser.error.code).toBe("not_found");

    expect(await mentorGrants(first.email)).toBe(1);
    const rows = await invitationRows(first.email);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.consumed_at).not.toBeNull();
  });

  it("accept vs revoke: a revoke that wins blocks the grant; an acceptance that wins keeps the role", async () => {
    // Revoke first.
    const late = await invitee("revoke-wins");
    const lateToken = await create(late.email);
    await holdOpenInvitation(late.email);
    const revoke = operator(["invite", "revoke", "--email", late.email]);
    await waitForLockWaiters(observer, 1);
    const accept = postAccept(lateToken, late.cookie);
    await waitForLockWaiters(observer, 2);
    await holder.query("commit");
    const [revoked, refused] = await Promise.all([revoke, accept]);
    expect(revoked.code).toBe(0);
    expect(revoked.stdout).toContain("Invitation revoked:");
    expectSecretFree(revoked, [lateToken]);
    expect(refused.status).toBe(404);
    expect(await rolesOf(late.email)).toEqual(["mentee"]);
    expect(await invitationRows(late.email)).toEqual([expect.objectContaining({ consumed_at: null, revoked_at: expect.any(Date) })]);

    // Acceptance first.
    const early = await invitee("accept-wins-r");
    const earlyToken = await create(early.email);
    await holdOpenInvitation(early.email);
    const accepted = postAccept(earlyToken, early.cookie);
    await waitForLockWaiters(observer, 1);
    const afterwards = operator(["invite", "revoke", "--email", early.email]);
    await waitForLockWaiters(observer, 2);
    await holder.query("commit");
    const [granted, noop] = await Promise.all([accepted, afterwards]);
    expect(granted.status).toBe(200);
    expect(noop.code).toBe(0);
    expect(noop.stdout).toContain(`${early.email} has no open invitation; nothing changed.`);
    expect(noop.stdout).toContain("revoking does not remove the mentor role.");
    expect(await rolesOf(early.email)).toEqual(["mentee", "mentor"]);
    expect(await invitationRows(early.email)).toEqual([expect.objectContaining({ consumed_at: expect.any(Date), revoked_at: null })]);
  });

  it("accept vs resend: a resend that wins voids the old link; an acceptance that wins is not undone", async () => {
    // Resend first.
    const late = await invitee("resend-wins");
    const oldToken = await create(late.email);
    await holdOpenInvitation(late.email);
    const resend = operator(["invite", "resend", "--email", late.email]);
    await waitForLockWaiters(observer, 1);
    const accept = postAccept(oldToken, late.cookie);
    await waitForLockWaiters(observer, 2);
    await holder.query("commit");
    const [resent, refused] = await Promise.all([resend, accept]);
    expect(resent.code).toBe(0);
    expect(resent.stdout).toContain("Invitation resent:");
    expect(refused.status).toBe(404);
    expect(await rolesOf(late.email)).toEqual(["mentee"]);
    const newToken = await newestInvitationToken(inbox, late.email, 2);
    seenTokens.push(newToken);
    expectSecretFree(resent, [oldToken, newToken]);
    expect(newToken).not.toBe(oldToken);
    // The replacement is the one usable link.
    expect(await invitationPage(newToken, late.cookie)).toContain("This account will receive the mentor role.");
    expect(await invitationPage(oldToken, late.cookie)).toContain("This invitation is not valid.");

    // Acceptance first.
    const early = await invitee("accept-wins-s");
    const earlyToken = await create(early.email);
    await holdOpenInvitation(early.email);
    const accepted = postAccept(earlyToken, early.cookie);
    await waitForLockWaiters(observer, 1);
    const afterwards = operator(["invite", "resend", "--email", early.email]);
    await waitForLockWaiters(observer, 2);
    await holder.query("commit");
    const [granted, refusedResend] = await Promise.all([accepted, afterwards]);
    expect(granted.status).toBe(200);
    expect(refusedResend.code).toBe(1);
    expect(refusedResend.stderr).toContain(`${early.email} has no open invitation to resend. Use invite create.`);
    expect(await rolesOf(early.email)).toEqual(["mentee", "mentor"]);
    const rows = await invitationRows(early.email);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.consumed_at).not.toBeNull();
    // No replacement was sent.
    expect(await inbox.messagesTo(early.email)).toHaveLength(1);
  });

  it("two concurrent invite create commands for one address: one invitation, one email", async () => {
    const email = address("create");
    // An uncommitted open row for the address: both commands find nothing to
    // lock, insert, and wait on its unique-index entry. On rollback they
    // race for the index; the second waits on the first and then conflicts.
    await holder.query("begin");
    await holder.query(
      "insert into mentor_invitations (id, created_at, updated_at, token_hash, expires_at, email) values (gen_random_uuid(), now(), now(), md5(random()::text) || md5(random()::text), now() + interval '14 days', $1)",
      [email]);
    const creates = [operator(["invite", "create", "--email", email]), operator(["invite", "create", "--email", email])];
    await waitForLockWaiters(observer, 2);
    await holder.query("rollback");
    const results = await Promise.all(creates);

    expect(results.map((result) => result.code).sort()).toEqual([0, 1]);
    const loser = results.find((result) => result.code === 1)!;
    expect(loser.stderr).toContain(`${email} already has an open invitation. Use invite resend or revoke.`);
    const token = await newestInvitationToken(inbox, email);
    seenTokens.push(token);
    for (const result of results) expectSecretFree(result, [token]);
    const rows = await invitationRows(email);
    expect(rows).toEqual([expect.objectContaining({ consumed_at: null, revoked_at: null })]);
    // Mail is asynchronous: give a stray second message time to arrive.
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(await inbox.messagesTo(email)).toHaveLength(1);
  });

  afterAll(async () => {
    await expectEvidenceFreeOf(seenTokens);
  });
});
