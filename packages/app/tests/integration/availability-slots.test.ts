import { randomUUID } from "node:crypto";
import { afterAll, expect, inject, it } from "vitest";
import { IntegrationBrowser } from "./browser";
import { setGitHubStubUser } from "./github-stub";
import { connect, githubSession, newestInvitationToken, operator, postAccept, query, waitForLockWaiters } from "./invitations";
import { MailpitInbox } from "./mailpit";

const base = inject("baseURL");
const browser = new IntegrationBrowser(`${inject("browserSession")}-slots`, inject("integrationArtifactsDirectory"));
const emails: string[] = [];
async function fixture() {
  const email = `slots-${randomUUID()}@example.com`; emails.push(email);
  const identity = { id: 9_000_000 + Math.floor(Math.random() * 1_000_000), email, name: "Slot Mentor" };
  const session = await githubSession(identity);
  expect((await operator(["invite", "create", "--email", email])).code).toBe(0);
  const token = await newestInvitationToken(new MailpitInbox(inject("mailpitURL")), email);
  expect((await postAccept(token, session.cookie)).status).toBe(200);
  const profile = await fetch(`${base}/api/mentors/profile`, { method: "PUT", headers: { cookie: session.cookie, "content-type": "application/json", "x-devmentor-csrf": "1" }, body: JSON.stringify({ area: "typescript", description: "Test mentor", publicWorkLinks: "https://example.com/work", price25Dollars: 40, price50Dollars: 70 }) });
  expect(profile.status).toBe(200);
  const { data } = await profile.json() as { data: { id: string } };
  return { ...session, identity, profileId: data.id };
}
function instant(minutes: number) { return new Date(Math.ceil(Date.now() / 60_000) * 60_000 + minutes * 60_000).toISOString(); }
function publish(cookie: string, startsAt: string) { return fetch(`${base}/api/availability/slots`, { method: "POST", headers: { cookie, "content-type": "application/json", "x-devmentor-csrf": "1" }, body: JSON.stringify({ startsAt }) }); }
function remove(cookie: string, id: string) { return fetch(`${base}/api/availability/slots?id=${id}`, { method: "DELETE", headers: { cookie, "x-devmentor-csrf": "1" } }); }
afterAll(async () => {
  try {
    await query("delete from availability_slots where mentor_profile_id in (select p.id from mentor_profiles p join users u on u.id = p.user_id where u.email = any($1))", [emails]);
    await query("delete from mentor_invitations where email = any($1)", [emails]);
    await query("delete from users where email = any($1)", [emails]);
    await query("delete from rate_limit_buckets");
  } finally { await browser.command("close"); }
});
it("publishes and withdraws slots, enforcing lead time and booked state", async () => {
  const f = await fixture();
  await setGitHubStubUser(inject("githubStubURL"), { id: f.identity.id, login: `gh-${f.identity.id}`, name: f.identity.name, emails: [{ email: f.identity.email, primary: true, verified: true }] });
  await browser.command("open", `${base}/sign-in`); await browser.click("link", "Sign in with GitHub"); await browser.click("link", "Authorize");
  await browser.command("open", `${base}/mentor/slots`); await browser.waitForText("No upcoming slots");
  const zone = await browser.command("eval", "Intl.DateTimeFormat().resolvedOptions().timeZone");
  expect(await browser.snapshot()).toContain(`Start time (your time zone: ${zone.result})`);
  const soon = instant(60);
  const local = (iso: string) => { const date = new Date(iso); return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16); };
  const fillDate = async (value: string) => browser.command("eval", `(() => { const input = document.querySelector('input[type=datetime-local]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)}); input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  await fillDate(local(soon)); await browser.click("button", "Publish slot");
  await browser.waitForText("Pick a time at least 2 hours from now.");
  const desired = instant(180);
  await fillDate(local(desired)); await browser.click("button", "Publish slot");
  await browser.waitForText("Open"); await browser.capture("slots-published");
  const rows = await query<{ id: string; starts_at: Date }>("select id, starts_at from availability_slots where mentor_profile_id = $1", [f.profileId]); expect(rows).toHaveLength(1);
  const start = rows[0]!.starts_at.toISOString();
  const conflict = await publish(f.cookie, new Date(Date.parse(start) + 30 * 60_000).toISOString()); expect(conflict.status).toBe(409);
  expect(JSON.stringify(await conflict.json())).toContain(start);
  await browser.click("button", "Remove"); await browser.click("button", "Remove slot"); await browser.waitForText("No upcoming slots");
  const booked = await publish(f.cookie, start); expect(booked.status).toBe(201);
  const { data } = await booked.json() as { data: { id: string } };
  await query("update availability_slots set booked_at = now() where id = $1", [data.id]);
  await browser.command("open", `${base}/mentor/slots`); await browser.waitForText("Booked");
  expect(await browser.snapshot()).not.toContain('button "Remove"'); await browser.capture("slots-booked");
  expect((await remove(f.cookie, data.id)).status).toBe(409);
});
it("serializes overlapping concurrent publishes", async () => {
  const f = await fixture(); const lock = await connect(); const observer = await connect();
  const firstStart = instant(300); let first: Promise<Response> | undefined; let second: Promise<Response> | undefined;
  try {
    await lock.query("begin"); await lock.query("select id from mentor_profiles where id = $1 for update", [f.profileId]);
    first = publish(f.cookie, firstStart); second = publish(f.cookie, new Date(Date.parse(firstStart) + 30 * 60_000).toISOString());
    await waitForLockWaiters(observer, 2);
  } finally { await lock.query("rollback"); await lock.end(); await observer.end(); }
  const responses = await Promise.all([first!, second!]); expect(responses.map((r) => r.status).sort()).toEqual([201, 409]);
  expect(await query("select id from availability_slots where mentor_profile_id = $1", [f.profileId])).toHaveLength(1);
});
