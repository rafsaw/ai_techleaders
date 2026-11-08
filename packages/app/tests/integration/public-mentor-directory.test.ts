import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";

import { githubSession, newestInvitationToken, operator, postAccept, query } from "./invitations";
import { MailpitInbox } from "./mailpit";

/**
 * The public mentor directory against real PostgreSQL (E03 Phase 1): who appears, who does not,
 * and what each entry path shows. The seed holds only a sample user, so every mentor role,
 * profile and payout state here is arranged explicitly — the role through the real invitation
 * flow, readiness through the hosted onboarding flow, never by writing rows.
 *
 * Everything is fetched without a cookie, because discovery is open to signed-out visitors.
 * Other scenarios share this app and may list their own mentors, so the assertions are about
 * these two mentors being present or absent, never about counts or ordering (unit tests own
 * ordering).
 */
const baseURL = inject("baseURL");
const inbox = new MailpitInbox(inject("mailpitURL"));
const suffix = randomUUID().slice(0, 8);
const emails: string[] = [];
const json = (cookie: string) => ({ cookie, "content-type": "application/json", "x-devmentor-csrf": "1" });

type Mentor = { profileId: string; displayName: string };

/** A mentor account with a saved profile: invited for real, then its profile written through the API. */
async function mentorWithProfile(label: string, area: string, description: string): Promise<Mentor & { cookie: string }> {
  // The invitation flow normalizes the address, so the local part stays lower-case here.
  const email = `directory-${label.toLowerCase()}-${suffix}@example.com`;
  emails.push(email);
  const displayName = `Directory ${label} ${suffix}`;
  const session = await githubSession({ id: 8_000_000 + Math.floor(Math.random() * 1_000_000), email, name: displayName });
  expect((await operator(["invite", "create", "--email", email])).code).toBe(0);
  expect((await postAccept(await newestInvitationToken(inbox, email), session.cookie)).status).toBe(200);
  const response = await fetch(`${baseURL}/api/mentors/profile`, {
    method: "PUT",
    headers: json(session.cookie),
    body: JSON.stringify({ area, description, publicWorkLinks: "https://example.com/work", price25Dollars: 40, price50Dollars: 70 }),
  });
  expect(response.status).toBe(200);
  const { data } = (await response.json()) as { data: { id: string } };
  return { profileId: data.id, displayName, cookie: session.cookie };
}

/** Drives the hosted onboarding flow until Stripe reports the account provisioned and ready. */
async function makeReady(cookie: string, profileId: string) {
  const start = await fetch(`${baseURL}/api/payments/onboarding`, { method: "POST", headers: json(cookie), body: JSON.stringify({ country: "US" }) });
  expect(start.status).toBe(200);
  const link = (await start.json() as { data: { url: string } }).data.url;
  const hosted = await fetch(link, { method: "POST", redirect: "manual", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ action: "complete" }) });
  expect(hosted.status).toBe(303);
  expect((await fetch(hosted.headers.get("location")!, { redirect: "manual", headers: { cookie } })).status).toBe(303);
  const [payout] = await query<{ status: string; provisioning_state: string }>(
    "select status, provisioning_state from payout_accounts where mentor_profile_id = $1",
    [profileId]
  );
  expect(payout).toMatchObject({ status: "ready", provisioning_state: "provisioned" });
}

/** Every page below is read as an anonymous visitor: no cookie, no sign-in, no redirect. */
async function publicPage(path: string) {
  const response = await fetch(`${baseURL}${path}`, { redirect: "manual" });
  return { status: response.status, html: await response.text() };
}

let ready: Mentor;
let unready: Mentor;

beforeAll(async () => {
  const readyMentor = await mentorWithProfile("Ready", "typescript", "Available for TypeScript reviews.");
  await makeReady(readyMentor.cookie, readyMentor.profileId);
  ready = readyMentor;
  // Saved profile, no payout onboarding at all: public, but not bookable (E02 MD4/MD7).
  unready = await mentorWithProfile("Unready", "react", "Not onboarded for payouts yet.");
}, 180_000);

afterAll(async () => {
  await query(
    "delete from payout_accounts where mentor_profile_id in (select p.id from mentor_profiles p join users u on u.id = p.user_id where u.email = any($1))",
    [emails]
  );
  await query("delete from mentor_invitations where email = any($1)", [emails]);
  await query("delete from users where email = any($1)", [emails]);
  await query("delete from rate_limit_buckets");
});

describe("public mentor directory (PostgreSQL)", () => {
  it("lists a bookable mentor that has no slots at all, and never an unready one", async () => {
    const [slots] = await query<{ count: number }>(
      "select count(*)::int as count from availability_slots where mentor_profile_id = $1",
      [ready.profileId]
    );
    expect(slots?.count).toBe(0);

    const { status, html } = await publicPage("/mentors");
    expect(status).toBe(200);
    expect(html).toContain("Find a mentor");
    // Listed with zero published times: the listing reads bookability, never availability.
    expect(html).toContain(ready.displayName);
    expect(html).toContain(`/mentors/${ready.profileId}`);
    expect(html).not.toContain(unready.displayName);
    expect(html).not.toContain(`/mentors/${unready.profileId}`);
    // Prices and ratings belong on the profile, not on a card.
    expect(html).not.toContain("25 min");
    expect(html).not.toContain("50 min");
  });

  it("filters by area and hands the chosen filter to the profile link", async () => {
    const typescript = await publicPage("/mentors?area=typescript");
    expect(typescript.status).toBe(200);
    expect(typescript.html).toContain(ready.displayName);
    expect(typescript.html).toContain(`/mentors/${ready.profileId}?fromArea=typescript`);

    // The ready mentor's area is TypeScript, so a React filter must not show them.
    const react = await publicPage("/mentors?area=react");
    expect(react.status).toBe(200);
    expect(react.html).not.toContain(ready.displayName);
    expect(react.html).not.toContain(unready.displayName);
  });

  it("offers a way back to all mentors for an unknown area, without a server error", async () => {
    const { status, html } = await publicPage("/mentors?area=golang");
    expect(status).toBe(200);
    expect(html).toContain("Unknown area");
    expect(html).toContain("All mentors");
    expect(html).not.toContain(ready.displayName);
  });

  it("returns to the filtered listing from a profile reached through it", async () => {
    const { status, html } = await publicPage(`/mentors/${ready.profileId}?fromArea=typescript`);
    expect(status).toBe(200);
    expect(html).toContain(ready.displayName);
    expect(html).toContain("Back to mentors");
    expect(html).toContain("/mentors?area=typescript");
    expect(html).not.toContain("Not taking bookings yet");
  });

  it("keeps an unready mentor's profile reachable by direct link, with no slots and no filter", async () => {
    const { status, html } = await publicPage(`/mentors/${unready.profileId}`);
    expect(status).toBe(200);
    expect(html).toContain(unready.displayName);
    expect(html).toContain("Not taking bookings yet");
    expect(html).toContain("Back to mentors");
    // A direct visit has no filter to preserve, so the link returns to the whole listing.
    expect(html).not.toContain("/mentors?area=");
  });
});
