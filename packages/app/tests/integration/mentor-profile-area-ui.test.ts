import { randomUUID } from "node:crypto";

import { afterAll, describe, expect, inject, it } from "vitest";

import { IntegrationBrowser } from "./browser";
import { githubSession, newestInvitationToken, operator, postAccept, query } from "./invitations";
import { MailpitInbox } from "./mailpit";

/**
 * Scenario MENTOR-001 (`.ai/qa/MENTOR/MENTOR-001-edit-profile-requires-an-area.md`): a mentor who
 * edits a published profile cannot save it without an area (spec MD3), and saves it once one is chosen.
 */
describe("mentor profile area (browser)", () => {
  const baseURL = inject("baseURL");
  const inbox = new MailpitInbox(inject("mailpitURL"));
  const browser = new IntegrationBrowser(`${inject("browserSession")}-area`, inject("integrationArtifactsDirectory"));
  const email = `profile-area-${randomUUID().slice(0, 8)}@example.com`;

  afterAll(async () => {
    try {
      await query("delete from mentor_invitations where email = $1", [email]);
      await query("delete from users where email = $1", [email]);
    } finally {
      await browser.command("close");
    }
  });

  async function publishedMentor() {
    const identity = { id: 6_000_000 + Math.floor(Math.random() * 1_000_000), email, name: "Area Mentor" };
    const { cookie } = await githubSession(identity);
    expect((await operator(["invite", "create", "--email", email])).code).toBe(0);
    expect((await postAccept(await newestInvitationToken(inbox, email), cookie)).status).toBe(200);
    const saved = await fetch(`${baseURL}/api/mentors/profile`, {
      method: "PUT",
      headers: { cookie, "content-type": "application/json", "x-devmentor-csrf": "1" },
      body: JSON.stringify({
        area: "typescript",
        description: "Reviews of service boundaries.",
        publicWorkLinks: "https://example.com/work",
        price25Dollars: 40,
        price50Dollars: 70,
      }),
    });
    expect(saved.status).toBe(200);
    return (await saved.json() as { data: { id: string } }).data.id;
  }

  const storedProfile = (id: string) =>
    query<{ area: string; updated_at: Date }>("select area, updated_at from mentor_profiles where id = $1", [id]);

  // The empty option's label is also "Choose an area", so only the alert under the field is the error.
  const areaError = /- alert\n\s+- StaticText "Choose an area"/u;

  it("refuses to save an edited profile without an area, then saves it once an area is chosen", async () => {
    const profileId = await publishedMentor();
    const published = await storedProfile(profileId);

    await browser.command("open", `${baseURL}/sign-in`);
    await browser.click("link", "Sign in with GitHub");
    await browser.click("link", "Authorize");
    await browser.command("open", `${baseURL}/mentor`);
    await browser.click("link", "Edit profile");
    await browser.waitForText("Edit profile");
    expect(await browser.snapshot()).not.toMatch(areaError);

    await browser.select("Area", "");
    await browser.click("button", "Save");
    await browser.waitForText("Choose an area");
    expect(await browser.snapshot()).toMatch(areaError);
    await browser.capture("mentor-area-missing");
    expect(await browser.url()).toBe(`${baseURL}/mentor/profile`);
    expect(await storedProfile(profileId)).toEqual(published);

    await browser.select("Area", "react");
    await browser.click("button", "Save");
    await browser.command("wait", "--url", `${baseURL}/mentor`);
    expect(await storedProfile(profileId)).toEqual([{ area: "react", updated_at: expect.any(Date) }]);
    await browser.command("open", `${baseURL}/mentors/${profileId}`);
    await browser.waitForText("Not taking bookings yet");
    const shown = await browser.snapshot();
    expect(shown).toContain('StaticText "React"');
    expect(shown).not.toContain('StaticText "TypeScript"');
    await browser.capture("mentor-area-chosen");
  });
});
