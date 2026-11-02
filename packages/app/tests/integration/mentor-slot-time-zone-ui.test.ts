import { randomUUID } from "node:crypto";

import { afterAll, describe, expect, inject, it } from "vitest";

import { IntegrationBrowser } from "./browser";
import { setGitHubStubUser } from "./github-stub";
import { githubSession, newestInvitationToken, operator, postAccept, query } from "./invitations";
import { MailpitInbox } from "./mailpit";

/**
 * Scenario MENTOR-002 (`.ai/qa/MENTOR/MENTOR-002-slot-in-mentor-time-zone.md`): a start time the
 * mentor picks in their own time zone is stored as the matching UTC instant and shown back as the
 * same local wall time. The browser is pinned to a zone far from UTC and from the CI host's zone,
 * so a missing or doubled offset cannot cancel out. `availability-slots.test.ts` covers lead time,
 * conflicts and booking in the host's zone; it does not check the stored instant.
 */
describe("mentor slot time zone (browser)", () => {
  const zone = "Pacific/Auckland";
  const baseURL = inject("baseURL");
  const inbox = new MailpitInbox(inject("mailpitURL"));
  const browser = new IntegrationBrowser(`${inject("browserSession")}-tz`, inject("integrationArtifactsDirectory"), { TZ: zone });
  const email = `slot-zone-${randomUUID().slice(0, 8)}@example.com`;

  afterAll(async () => {
    try {
      await query("delete from availability_slots where mentor_profile_id in (select p.id from mentor_profiles p join users u on u.id = p.user_id where u.email = $1)", [email]);
      await query("delete from mentor_invitations where email = $1", [email]);
      await query("delete from users where email = $1", [email]);
    } finally {
      await browser.command("close");
    }
  });

  // The UTC instant at which `zone`'s wall clock reads `wall` ("YYYY-MM-DDTHH:mm"), computed without
  // the code under test: read the zone's wall clock for a guess and correct by the difference.
  function instantInZone(wall: string): string {
    const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: zone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
    const wallClock = (ms: number) => {
      const p = Object.fromEntries(formatter.formatToParts(ms).map((part) => [part.type, part.value]));
      return Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:00Z`);
    };
    const target = Date.parse(`${wall}:00Z`);
    return new Date(target - (wallClock(target) - target)).toISOString();
  }

  it("stores a slot picked in the mentor's zone as the matching UTC instant and shows it back in that zone", async () => {
    const identity = { id: 7_000_000 + Math.floor(Math.random() * 1_000_000), email, name: "Zone Mentor" };
    const { cookie } = await githubSession(identity);
    expect((await operator(["invite", "create", "--email", email])).code).toBe(0);
    expect((await postAccept(await newestInvitationToken(inbox, email), cookie)).status).toBe(200);
    const saved = await fetch(`${baseURL}/api/mentors/profile`, {
      method: "PUT",
      headers: { cookie, "content-type": "application/json", "x-devmentor-csrf": "1" },
      body: JSON.stringify({ area: "typescript", description: "Zone test mentor", publicWorkLinks: "https://example.com/work", price25Dollars: 40, price50Dollars: 70 }),
    });
    expect(saved.status).toBe(200);
    const profileId = (await saved.json() as { data: { id: string } }).data.id;

    // A mid-morning wall time ten days out: well past the 2-hour lead time and clear of any DST changeover.
    const day = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
    const wall = `${day}T10:30`;
    const expected = instantInZone(wall);
    expect(expected).not.toBe(`${wall}:00.000Z`); // the zone really differs from UTC

    await setGitHubStubUser(inject("githubStubURL"), { id: identity.id, login: `gh-${identity.id}`, name: identity.name, emails: [{ email, primary: true, verified: true }] });
    await browser.command("open", `${baseURL}/sign-in`);
    await browser.click("link", "Sign in with GitHub");
    await browser.click("link", "Authorize");
    await browser.command("open", `${baseURL}/mentor/slots`);
    await browser.waitForText("No upcoming slots");
    expect((await browser.command("eval", "Intl.DateTimeFormat().resolvedOptions().timeZone")).result).toBe(zone);
    expect(await browser.snapshot()).toContain(`Start time (your time zone: ${zone})`);

    // Enter the wall time the way a mentor would: set the datetime-local input and let React see it.
    await browser.command("eval", `(() => { const input = document.querySelector('input[type=datetime-local]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(wall)}); input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    await browser.click("button", "Publish slot");
    await browser.waitForText("Open");

    const rows = await query<{ starts_at: Date }>("select starts_at from availability_slots where mentor_profile_id = $1", [profileId]);
    expect(rows.map((row) => row.starts_at.toISOString())).toEqual([expected]);

    // The row shows the instant in the mentor's zone, right after publishing and after a reload.
    const displayed = async () => JSON.parse((await browser.command("eval", "(() => { const t = document.querySelector('time'); return JSON.stringify({ dateTime: t.getAttribute('datetime'), text: t.textContent }); })()")).result as string) as { dateTime: string; text: string };
    const afterPublish = await displayed();
    await browser.capture("slot-zone-published");
    await browser.command("open", `${baseURL}/mentor/slots`);
    await browser.waitForText("Open");
    const afterReload = await displayed();
    for (const shown of [afterPublish, afterReload]) {
      expect(new Date(shown.dateTime).toISOString()).toBe(expected);
      expect(shown.text).toMatch(/10:30\s?AM/u);
      expect(shown.text).toMatch(/GMT\+1[23]/u);
    }
    await browser.capture("slot-zone-reloaded");
  });
});
