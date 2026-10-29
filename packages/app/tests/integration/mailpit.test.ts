import { randomUUID } from "node:crypto";

import { beforeEach, describe, expect, inject, it } from "vitest";

import { SmtpEmailSender } from "@/server/services/notifications/adapters/smtp-email-sender";
import { emailConfirmationEmail } from "@/server/services/notifications/templates/email-confirmation";

import { INTEGRATION_MAIL_FROM, linksIn, MailpitInbox } from "./mailpit";

/**
 * The integration inbox (E01 step 2.2): the real SMTP adapter submits a
 * rendered confirmation email to the ephemeral Mailpit, and the inbox helper
 * reads it back over the HTTP API. No app flow sends mail yet; Phase 2's
 * sign-up scenarios build on this helper.
 */
describe("SMTP sender and Mailpit inbox", () => {
  const inbox = new MailpitInbox(inject("mailpitURL"));
  const sender = new SmtpEmailSender({
    config: { email: () => ({ smtpUrl: inject("smtpURL"), from: INTEGRATION_MAIL_FROM }) },
  });

  beforeEach(async () => {
    await inbox.clear();
  });

  it("delivers a confirmation email whose absolute link can be read back", async () => {
    const recipient = `ada-${randomUUID()}@example.com`;
    const appUrl = new URL(inject("baseURL"));
    const token = randomUUID();
    await sender.send({
      to: recipient,
      ...emailConfirmationEmail({ appUrl, displayName: "Ada <Lovelace>", token, returnTo: "/account", expiresInHours: 24 }),
    });
    await sender.send({ to: "someone-else@example.com", subject: "Other", text: "Not for Ada" });

    const message = await inbox.waitForMessageTo(recipient);
    expect(message.From.Address).toBe("no-reply@devmentor.test");
    expect(message.Subject).toBe("Confirm your email address for DevMentor");
    expect(message.HTML).toContain("Hi Ada &lt;Lovelace&gt;,");
    const [link] = linksIn(message.Text);
    expect(link!.origin).toBe(appUrl.origin);
    expect(link!.pathname).toBe("/confirm-email");
    expect(link!.searchParams.get("token")).toBe(token);
    expect(link!.searchParams.get("returnTo")).toBe("/account");
    expect(await inbox.messagesTo(recipient.toUpperCase())).toHaveLength(1);

    await inbox.clear();
    expect(await inbox.messages()).toEqual([]);
  });
});
