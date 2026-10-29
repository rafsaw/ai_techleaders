import { randomUUID } from "node:crypto";
import { appendFile } from "node:fs/promises";
import { join } from "node:path";

import pg from "pg";
import { afterAll, afterEach, describe, expect, inject, it } from "vitest";

import { IntegrationBrowser } from "./browser";
import { linksIn, MailpitInbox } from "./mailpit";

/**
 * A double click on Create account (Phase 2 manual test): the form stays
 * locked from a successful answer until the page has navigated away, so the
 * second click sends no second registration. Without the lock the second
 * request is a valid re-registration ("the last registration wins"): a second
 * email, and the first email's link no longer works.
 *
 * Rate limits: the address spends 1 of rule 4 and 1 of rule 2.
 */
describe("password sign-up double click", () => {
  const baseURL = inject("baseURL");
  const artifactsDirectory = inject("integrationArtifactsDirectory");
  const browser = new IntegrationBrowser(`${inject("browserSession")}-dbl`, artifactsDirectory);
  const inbox = new MailpitInbox(inject("mailpitURL"));
  const carol = { name: "Carol Double", email: `pw-carol-${randomUUID()}@example.com`, password: "a lantern by the harbour wall" };

  async function query<T extends pg.QueryResultRow>(text: string, values: unknown[] = []): Promise<T[]> {
    const client = new pg.Client({ connectionString: inject("databaseURL") });
    await client.connect();
    try {
      return (await client.query<T>(text, values)).rows;
    } finally {
      await client.end();
    }
  }

  afterEach(async ({ task }) => {
    try {
      await browser.capture(`double-submit-${task.name}`);
    } catch (error) {
      await appendFile(join(artifactsDirectory, "capture.log"), `${task.name}: ${String(error)}\n`);
    }
  });

  afterAll(async () => {
    try {
      await query("delete from users where email = $1", [carol.email]);
      await query("delete from rate_limit_buckets");
    } finally {
      await browser.command("close");
    }
  });

  it("sends one confirmation email whose link confirms the address", async () => {
    await browser.command("cookies", "clear");
    await browser.command("open", `${baseURL}/sign-up`);
    await browser.waitForText("Create an account");
    await browser.fill("Display name", carol.name);
    await browser.fill("Email", carol.email);
    await browser.fill("Password", carol.password);

    // A double click's second click can land after a fast answer, while the
    // client navigation to Check your inbox is still loading. The observer
    // clicks once more as soon as the button is enabled again on /sign-up.
    await browser.command("eval", `(() => {
      const button = [...document.querySelectorAll("button[type=submit]")].find((b) => b.textContent.trim() === "Create account");
      window.__lateClicks = 0;
      new MutationObserver(() => {
        if (!button.disabled && location.pathname === "/sign-up" && window.__lateClicks === 0) {
          window.__lateClicks += 1;
          button.click();
        }
      }).observe(button, { attributes: true, attributeFilter: ["disabled"] });
    })()`);
    await browser.command("scrollintoview", "button[type=submit]");
    await browser.command("dblclick", "button[type=submit]");

    await browser.waitForText(`Check your inbox at ${carol.email}`);
    expect((await browser.command("eval", "window.__lateClicks")).result).toBe(0);
    await inbox.waitForMessageTo(carol.email);
    // Give a second request, if one was sent, time to reach Mailpit.
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    const messages = await inbox.messagesTo(carol.email);
    expect(messages).toHaveLength(1);
    const tokens = await query<{ count: string }>(
      "select count(*) from email_confirmation_tokens t join users u on u.id = t.user_id where u.email = $1", [carol.email]);
    expect(tokens[0]!.count).toBe("1");

    const [link] = linksIn((await inbox.message(messages[0]!.ID)).Text).filter((url) => url.pathname === "/confirm-email");
    await browser.command("open", `${baseURL}${link!.pathname}${link!.search}`);
    await browser.waitForText(`Enter your password to confirm ${carol.email}`);
    await browser.fill("Password", carol.password);
    await browser.click("button", "Confirm");
    await browser.command("wait", "--url", `${baseURL}/`);
    await browser.waitForText("Sign out");
    const [user] = await query<{ email_confirmed_at: Date | null }>("select email_confirmed_at from users where email = $1", [carol.email]);
    expect(user!.email_confirmed_at).not.toBeNull();
  });
});
