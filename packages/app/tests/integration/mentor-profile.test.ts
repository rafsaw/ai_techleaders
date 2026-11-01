import { randomUUID } from "node:crypto";

import { afterAll, describe, expect, inject, it } from "vitest";

import {
  connect,
  githubSession,
  newestInvitationToken,
  operator,
  postAccept,
  query,
  waitForLockWaiters,
} from "./invitations";
import { MailpitInbox } from "./mailpit";

/**
 * The profile write API against real PostgreSQL (E02 Phase 1, `SDLC.md` risk-high evidence): who
 * may write, which prices are refused, replacing a saved profile, the concurrent first save and
 * the isolation between mentors. Mentors come only from the real invitation flow.
 */
describe("mentor profile write API (PostgreSQL)", () => {
  const baseURL = inject("baseURL");
  const inbox = new MailpitInbox(inject("mailpitURL"));
  const suffix = randomUUID().slice(0, 8);
  const seed = 7_000_000 + Math.floor(Math.random() * 1_000_000);
  let next = 0;
  const addresses: string[] = [];
  let invalidInputMentor: Awaited<ReturnType<typeof mentor>> | undefined;
  const body = {
    area: "react",
    description: "Reviews of React rendering and state.",
    publicWorkLinks: "https://github.com/example/react-review",
    price25Dollars: 40,
    price50Dollars: 70,
  };

  afterAll(async () => {
    await query("delete from mentor_invitations where email = any($1)", [addresses]);
    await query("delete from users where email = any($1)", [addresses]);
  });

  async function mentee(label: string) {
    const email = `profile-${label}-${suffix}@example.com`;
    addresses.push(email);
    const session = await githubSession({ id: seed + next++, email, name: `Profile ${label}` });
    const [user] = await query<{ id: string }>("select id from users where email = $1", [email]);
    return { email, userId: user!.id, cookie: session.cookie };
  }

  async function mentor(label: string) {
    const account = await mentee(label);
    expect((await operator(["invite", "create", "--email", account.email])).code).toBe(0);
    const accepted = await postAccept(await newestInvitationToken(inbox, account.email), account.cookie);
    expect(accepted.status).toBe(200);
    return account;
  }

  function put(input: unknown, cookie?: string): Promise<Response> {
    return fetch(`${baseURL}/api/mentors/profile`, {
      method: "PUT",
      headers: { "content-type": "application/json", "x-devmentor-csrf": "1", ...(cookie ? { cookie } : {}) },
      body: JSON.stringify(input),
    });
  }

  const profilesOf = (userId: string) => query<{ id: string; price_25_cents: number; price_50_cents: number }>(
    "select id, price_25_cents, price_50_cents from mentor_profiles where user_id = $1", [userId]);

  it("refuses signed-out and mentee writes without storing anything", async () => {
    const before = await query<{ profiles: number }>("select count(*)::int as profiles from mentor_profiles");

    const signedOut = await put(body);
    expect(signedOut.status).toBe(401);
    expect((await signedOut.json()).error.code).toBe("unauthorized");

    const lin = await mentee("denied");
    const forbidden = await put(body, lin.cookie);
    expect(forbidden.status).toBe(403);
    expect((await forbidden.json()).error.code).toBe("forbidden");

    expect(await query("select count(*)::int as profiles from mentor_profiles")).toEqual(before);
  });

  it.each([
    ["below the lowest price", { price25Dollars: 4 }, "price25Dollars", "The lowest price is $5"],
    ["above the highest price", { price50Dollars: 1_001 }, "price50Dollars", "The highest price is $1,000"],
    ["a fractional price", { price25Dollars: 40.5 }, "price25Dollars", "Enter a whole number of dollars"],
    ["a NUL character in the description", { description: "a\u0000b" }, "description", "Remove the unsupported character"],
    ["a NUL character in a link", { publicWorkLinks: "https://example.com/\u0000" }, "publicWorkLinks", "Line 1: use a full https:// link"],
  ])("rejects %s with a field error and stores nothing", async (_label, change, field, message) => {
    const ada = (invalidInputMentor ??= await mentor("invalid"));
    const response = await put({ ...body, ...change }, ada.cookie);
    expect(response.status).toBe(400);
    expect((await response.json()).error.fieldErrors).toEqual({ [field]: [message] });
    expect(await profilesOf(ada.userId)).toEqual([]);
  });

  it("replaces a saved profile in one row, and the public page shows only the new values", async () => {
    const ada = await mentor("replace");
    const first = await put(body, ada.cookie);
    expect(first.status).toBe(200);
    const { data: saved } = await first.json();
    expect(await profilesOf(ada.userId)).toEqual([{ id: saved.id, price_25_cents: 4_000, price_50_cents: 7_000 }]);

    const links = "https://example.com/a,b\nhttps://example.com/{c}";
    const second = await put({ ...body, area: "python", publicWorkLinks: links, price25Dollars: 45, price50Dollars: 80 }, ada.cookie);
    expect(second.status).toBe(200);
    expect((await second.json()).data).toMatchObject({
      id: saved.id,
      area: "python",
      publicWorkLinks: ["https://example.com/a,b", "https://example.com/{c}"],
      prices: { 25: { amountMinor: 4_500, currency: "USD" }, 50: { amountMinor: 8_000, currency: "USD" } },
    });
    expect(await profilesOf(ada.userId)).toEqual([{ id: saved.id, price_25_cents: 4_500, price_50_cents: 8_000 }]);

    const page = await fetch(`${baseURL}/mentors/${saved.id}`);
    expect(page.status).toBe(200);
    const html = await page.text();
    for (const shown of ["$45", "$80", "example.com/a,b", "example.com/{c}"]) expect(html).toContain(shown);
    expect(html).not.toContain("react-review");
  });

  it("retries a first save that loses the race as a replacement", async () => {
    const ada = await mentor("race");
    const holder = await connect();
    const observer = await connect();
    try {
      // The holder's uncommitted row makes the request's insert wait on the unique user index.
      await holder.query("begin");
      const { rows } = await holder.query<{ id: string }>(
        `insert into mentor_profiles (id, created_at, updated_at, user_id, area, description, public_work_links, price_25_cents, price_50_cents)
         values (gen_random_uuid(), now(), now(), $1, 'python', 'Concurrent first save', array['https://example.com/first'], 1000, 2000)
         returning id`,
        [ada.userId],
      );
      const pending = put(body, ada.cookie);
      await waitForLockWaiters(observer, 1);
      await holder.query("commit");

      const response = await pending;
      expect(response.status).toBe(200);
      expect((await response.json()).data.id).toBe(rows[0]!.id);
      expect(await profilesOf(ada.userId)).toEqual([{ id: rows[0]!.id, price_25_cents: 4_000, price_50_cents: 7_000 }]);
    } finally {
      await holder.end();
      await observer.end();
    }
  });

  it("keeps each mentor's write and setup page to their own profile", async () => {
    const ada = await mentor("owner");
    const lin = await mentor("other");
    const { data: adaProfile } = await (await put({ ...body, description: "Ada-only description" }, ada.cookie)).json();

    // Identifiers in the body are not part of the contract, so they cannot redirect a write.
    const { data: linProfile } = await (await put({
      ...body,
      id: adaProfile.id,
      userId: ada.userId,
      user: ada.userId,
      description: "Lin-only description",
      price25Dollars: 50,
    }, lin.cookie)).json();

    expect(linProfile.id).not.toBe(adaProfile.id);
    expect(await profilesOf(ada.userId)).toEqual([{ id: adaProfile.id, price_25_cents: 4_000, price_50_cents: 7_000 }]);
    expect(await profilesOf(lin.userId)).toEqual([{ id: linProfile.id, price_25_cents: 5_000, price_50_cents: 7_000 }]);

    const setup = await (await fetch(`${baseURL}/mentor/profile`, { headers: { cookie: ada.cookie } })).text();
    expect(setup).toContain("Ada-only description");
    expect(setup).not.toContain("Lin-only description");
  });
});
