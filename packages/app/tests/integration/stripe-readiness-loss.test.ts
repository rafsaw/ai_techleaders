import { randomUUID } from "node:crypto";

import { afterAll, describe, expect, inject, it } from "vitest";

import { IntegrationBrowser } from "./browser";
import { setGitHubStubUser } from "./github-stub";
import { githubSession, newestInvitationToken, operator, postAccept, query } from "./invitations";
import { MailpitInbox } from "./mailpit";

const baseURL = inject("baseURL");
const stripeURL = inject("stripeStubURL");
const browser = new IntegrationBrowser(`${inject("browserSession")}-lost`, inject("integrationArtifactsDirectory"));
const emails: string[] = [];
const json = (cookie: string) => ({ cookie, "content-type": "application/json", "x-devmentor-csrf": "1" });

async function webhook(accountId: string, flags: { ready?: boolean; revoke?: boolean }) {
  const response = await fetch(`${stripeURL}/__stub/event`, { method: "POST", body: JSON.stringify({ accountId, ...flags }) });
  return (await response.json() as { status: number }).status;
}
const payout = async (profileId: string) => (await query<{ stripe_account_id: string; status: string; provisioning_state: string }>("select stripe_account_id, status, provisioning_state from payout_accounts where mentor_profile_id = $1", [profileId]))[0];

afterAll(async () => {
  try {
    await query("delete from availability_slots where mentor_profile_id in (select p.id from mentor_profiles p join users u on u.id = p.user_id where u.email = any($1))", [emails]);
    await query("delete from payout_accounts where mentor_profile_id in (select p.id from mentor_profiles p join users u on u.id = p.user_id where u.email = any($1))", [emails]);
    await query("delete from mentor_invitations where email = any($1)", [emails]);
    await query("delete from users where email = any($1)", [emails]);
    await query("delete from rate_limit_buckets");
  } finally { await browser.command("close"); }
});

describe("Stripe readiness loss (browser)", () => {
  it("removes bookability and offers Continue with Stripe when a ready mentor becomes past due, leaving a booked slot untouched", async () => {
    const email = `lost-${randomUUID()}@example.com`; emails.push(email);
    const identity = { id: 9_000_000 + Math.floor(Math.random() * 1_000_000), email, name: "Lapsed Mentor" };
    const session = await githubSession(identity);
    expect((await operator(["invite", "create", "--email", email])).code).toBe(0);
    expect((await postAccept(await newestInvitationToken(new MailpitInbox(inject("mailpitURL")), email), session.cookie)).status).toBe(200);
    const profile = await fetch(`${baseURL}/api/mentors/profile`, { method: "PUT", headers: json(session.cookie), body: JSON.stringify({ area: "typescript", description: "Test mentor", publicWorkLinks: "https://example.com/work", price25Dollars: 40, price50Dollars: 70 }) });
    expect(profile.status).toBe(200);
    const { data } = await profile.json() as { data: { id: string } };

    // Onboard through the hosted flow until Stripe reports the account ready.
    const start = await fetch(`${baseURL}/api/payments/onboarding`, { method: "POST", headers: json(session.cookie), body: JSON.stringify({ country: "US" }) });
    expect(start.status).toBe(200);
    const link = (await start.json() as { data: { url: string } }).data.url;
    const hosted = await fetch(link, { method: "POST", redirect: "manual", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ action: "complete" }) });
    expect((await fetch(hosted.headers.get("location")!, { redirect: "manual", headers: { cookie: session.cookie } })).status).toBe(303);
    const before = await payout(data.id);
    expect(before).toMatchObject({ status: "ready", provisioning_state: "provisioned" });

    // An open slot, so the mentor is fully bookable before Stripe changes.
    const startsAt = new Date(Math.ceil(Date.now() / 60_000) * 60_000 + 300 * 60_000).toISOString();
    const slot = await fetch(`${baseURL}/api/availability/slots`, { method: "POST", headers: json(session.cookie), body: JSON.stringify({ startsAt }) });
    expect(slot.status).toBe(201);
    const slotId = (await slot.json() as { data: { id: string } }).data.id;

    await setGitHubStubUser(inject("githubStubURL"), { id: identity.id, login: `gh-${identity.id}`, name: identity.name, emails: [{ email, primary: true, verified: true }] });
    await browser.command("open", `${baseURL}/sign-in`); await browser.click("link", "Sign in with GitHub"); await browser.click("link", "Authorize");
    await browser.command("open", `${baseURL}/mentor`);
    await browser.waitForText("You are bookable.");
    await browser.command("open", `${baseURL}/mentors/${data.id}`);
    expect(await browser.snapshot()).not.toContain("Not taking bookings yet");
    await browser.capture("lost-before-bookable");

    // A mentee books it (the spec says booked slots are untouched by a restriction); then Stripe reports
    // unmet requirements, through a signed webhook.
    await query("update availability_slots set booked_at = now() where id = $1", [slotId]);

    expect(await webhook(before!.stripe_account_id, { revoke: true })).toBe(200);
    expect(await payout(data.id)).toMatchObject({ stripe_account_id: before!.stripe_account_id, status: "incomplete", provisioning_state: "provisioned" });

    await browser.command("open", `${baseURL}/mentor`);
    await browser.waitForText("Not bookable yet: finish Stripe.");
    expect(await browser.snapshot()).toContain("Continue with Stripe");
    await browser.capture("lost-setup-not-bookable");
    await browser.command("open", `${baseURL}/mentors/${data.id}`);
    await browser.waitForText("Not taking bookings yet");
    await browser.capture("lost-public-not-bookable");
    expect(await query("select id from availability_slots where id = $1 and booked_at is not null", [slotId])).toHaveLength(1);
    await browser.command("open", `${baseURL}/mentor/slots`);
    await browser.waitForText("Booked");
  });
});
