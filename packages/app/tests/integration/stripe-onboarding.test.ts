import { randomUUID } from "node:crypto";

import { afterAll, afterEach, describe, expect, inject, it } from "vitest";

import { IntegrationBrowser } from "./browser";
import { setGitHubStubUser } from "./github-stub";
import { githubSession, newestInvitationToken, operator, postAccept, query } from "./invitations";
import { MailpitInbox } from "./mailpit";

const baseURL = inject("baseURL");
const stripeURL = inject("stripeStubURL");
const browser = new IntegrationBrowser(`${inject("browserSession")}-stripe`, inject("integrationArtifactsDirectory"));
const inbox = new MailpitInbox(inject("mailpitURL"));
const emails: string[] = [];
let sequence = 0;
const suffix = randomUUID().slice(0, 8);

async function fixture() {
  const id = 9_000_000 + Math.floor(Math.random() * 1_000_000);
  const email = `stripe-${suffix}-${sequence++}@example.com`;
  emails.push(email);
  const identity = { id, email, name: "Stripe Mentor" };
  const session = await githubSession(identity);
  expect((await operator(["invite", "create", "--email", email])).code).toBe(0);
  const token = await newestInvitationToken(inbox, email);
  expect((await postAccept(token, session.cookie)).status).toBe(200);
  const profile = await fetch(`${baseURL}/api/mentors/profile`, { method: "PUT", headers: { cookie: session.cookie, "content-type": "application/json", "x-devmentor-csrf": "1" }, body: JSON.stringify({ area: "typescript", description: "Test mentor", publicWorkLinks: "https://example.com/work", price25Dollars: 40, price50Dollars: 70 }) });
  expect(profile.status).toBe(200);
  const value = await profile.json() as { data: { id: string } };
  return { ...session, identity, profileId: value.data.id };
}
function start(cookie: string) {
  return fetch(`${baseURL}/api/payments/onboarding`, { method: "POST", headers: { cookie, "content-type": "application/json", "x-devmentor-csrf": "1" }, body: JSON.stringify({ country: "US" }) });
}
async function control(value: object) { await fetch(`${stripeURL}/__stub/fault`, { method: "POST", body: JSON.stringify(value) }); }
async function event(accountId: string, ready = false) {
  const response = await fetch(`${stripeURL}/__stub/event`, { method: "POST", body: JSON.stringify({ accountId, ready }) });
  return (await response.json() as { status: number }).status;
}
async function rows(profileId: string) {
  return query<{ id: string; stripe_account_id: string | null; provisioning_state: string; status: string }>("select id, stripe_account_id, provisioning_state, status from payout_accounts where mentor_profile_id = $1", [profileId]);
}
async function accounts(profileId: string) {
  const response = await fetch(`${stripeURL}/__stub/accounts`);
  return (await response.json() as { id: string; metadata: { mentor_profile_id: string } }[]).filter((a) => a.metadata.mentor_profile_id === profileId);
}
async function startLink(cookie: string) {
  const response = await start(cookie);
  expect(response.status).toBe(200);
  return (await response.json() as { data: { url: string } }).data.url;
}
async function hostedAction(link: string, action: string) {
  const response = await fetch(link, { method: "POST", redirect: "manual", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ action }) });
  expect(response.status).toBe(303);
  return response.headers.get("location")!;
}
async function followReturn(cookie: string, destination: string) {
  return fetch(destination, { redirect: "manual", headers: { cookie } });
}

afterEach(async () => { await control({}); });
afterAll(async () => {
  try {
    await query("delete from payout_accounts where mentor_profile_id in (select p.id from mentor_profiles p join users u on u.id = p.user_id where u.email = any($1))", [emails]);
    await query("delete from mentor_invitations where email = any($1)", [emails]);
    await query("delete from users where email = any($1)", [emails]);
    await query("delete from rate_limit_buckets");
  } finally { await browser.command("close"); }
});

describe("Stripe Connect onboarding", () => {
  it("completes onboarding and shows bookability on setup and public pages", async () => {
    const f = await fixture();
    await setGitHubStubUser(inject("githubStubURL"), { id: f.identity.id, login: `gh-${f.identity.id}`, name: f.identity.name, emails: [{ email: f.identity.email, primary: true, verified: true }] });
    await browser.command("open", `${baseURL}/sign-in`);
    await browser.click("link", "Sign in with GitHub");
    await browser.click("link", "Authorize");
    await browser.command("open", `${baseURL}/mentors/${f.profileId}`);
    await browser.waitForText("Not taking bookings yet");
    await browser.command("open", `${baseURL}/mentor`);
    await browser.waitForText("Payouts with Stripe");
    await browser.select("Country", "US");
    await browser.click("button", "Continue to Stripe");
    await browser.waitForText("Stripe test onboarding");
    await browser.click("button", "Complete");
    await browser.waitForText("You are bookable.");
    await browser.capture("stripe-ready-setup");
    await browser.command("open", `${baseURL}/mentors/${f.profileId}`);
    expect(await browser.snapshot()).not.toContain("Not taking bookings yet");
    await browser.capture("stripe-ready-public");
    expect((await rows(f.profileId))[0]?.status).toBe("ready");
  });

  it("moves pending to ready after a signed webhook", async () => {
    const f = await fixture(); const link = await startLink(f.cookie);
    const destination = await hostedAction(link, "pending");
    expect((await followReturn(f.cookie, destination)).status).toBe(303);
    const [row] = await rows(f.profileId); expect(row?.status).toBe("pending");
    expect(await event(row!.stripe_account_id!, true)).toBe(200);
    expect((await rows(f.profileId))[0]?.status).toBe("ready");
  });

  it("resumes an abandoned account without creating another", async () => {
    const f = await fixture(); const first = await startLink(f.cookie);
    await followReturn(f.cookie, await hostedAction(first, "abandon"));
    await startLink(f.cookie);
    expect(await accounts(f.profileId)).toHaveLength(1);
  });

  it("refreshes an expired link without creating another account", async () => {
    const f = await fixture(); const first = await startLink(f.cookie);
    const response = await followReturn(f.cookie, await hostedAction(first, "expire"));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain(`${stripeURL}/hosted/`);
    expect(await accounts(f.profileId)).toHaveLength(1);
  });

  it("tolerates duplicate signed deliveries without another binding", async () => {
    const f = await fixture(); await startLink(f.cookie);
    const [row] = await rows(f.profileId);
    expect(await event(row!.stripe_account_id!, true)).toBe(200);
    expect(await event(row!.stripe_account_id!, true)).toBe(200);
    expect(await rows(f.profileId)).toHaveLength(1);
    expect((await rows(f.profileId))[0]?.status).toBe("ready");
  });

  it("recovers a timed-out create by listing without another account", async () => {
    const f = await fixture(); await control({ mode: "timeout-after-create" });
    expect((await start(f.cookie)).status).toBe(502);
    expect((await rows(f.profileId))[0]?.provisioning_state).toBe("reconciliation_required");
    await control({}); await startLink(f.cookie);
    expect(await accounts(f.profileId)).toHaveLength(1);
    expect((await rows(f.profileId))[0]?.provisioning_state).toBe("provisioned");
  });

  it("attaches a webhook delivered before create returns", async () => {
    const f = await fixture(); await control({ mode: "webhook-before-create" });
    await startLink(f.cookie);
    const [row] = await rows(f.profileId);
    expect(row?.provisioning_state).toBe("provisioned");
    expect(row?.stripe_account_id).toBe((await accounts(f.profileId))[0]?.id);
  });

  it("retries a failed return against Stripe", async () => {
    const f = await fixture(); const link = await startLink(f.cookie);
    const destination = await hostedAction(link, "complete");
    await browser.command("cookies", "clear");
    await setGitHubStubUser(inject("githubStubURL"), { id: f.identity.id, login: `gh-${f.identity.id}`, name: f.identity.name, emails: [{ email: f.identity.email, primary: true, verified: true }] });
    await browser.command("open", `${baseURL}/sign-in`);
    await browser.click("link", "Sign in with GitHub");
    await browser.click("link", "Authorize");
    await control({ failRetrieve: true });
    await browser.command("open", destination);
    await browser.waitForText("We couldn't reach Stripe to check your status.");
    await browser.capture("stripe-check-failed");
    await control({});
    await browser.click("link", "Try checking again");
    await browser.waitForText("You are bookable.");
    expect((await rows(f.profileId))[0]?.status).toBe("ready");
  });

  it("concurrent starts retain one local row and one Stripe account", async () => {
    const f = await fixture();
    await control({ mode: "hold-create" });
    const first = start(f.cookie);
    try {
      let held = false;
      for (let attempt = 0; attempt < 100 && !held; attempt++) {
        const response = await fetch(`${stripeURL}/__stub/state`);
        held = (await response.json() as { createHeld: boolean }).createHeld;
        if (!held) await new Promise((resolve) => setTimeout(resolve, 50));
      }
      expect(held).toBe(true);
      const [row] = await rows(f.profileId);
      const competingProviderRequest = await fetch(`${stripeURL}/v1/accounts`, {
        method: "POST", headers: { "idempotency-key": `payout-account-${row!.id}` },
      });
      expect(competingProviderRequest.status).toBe(409);
      const second = await start(f.cookie);
      expect(second.status).toBe(200);
    } finally {
      await fetch(`${stripeURL}/__stub/release`, { method: "POST" });
    }
    expect((await first).status).toBe(200);
    expect(await rows(f.profileId)).toHaveLength(1);
    expect(await accounts(f.profileId)).toHaveLength(1);
  });
});
