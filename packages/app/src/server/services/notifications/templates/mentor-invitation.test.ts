import { describe, expect, it } from "vitest";

import {
  mentorInvitationEmail,
  mentorInvitationUrl,
} from "@/server/services/notifications/templates/mentor-invitation";

const appUrl = new URL("https://devmentor.test");
const token = "tok_abc-123";

describe("mentor invitation template", () => {
  it("links absolutely to /invite/<token> and ignores any path on APP_URL", () => {
    expect(mentorInvitationUrl({ appUrl, token }).href).toBe("https://devmentor.test/invite/tok_abc-123");
    expect(mentorInvitationUrl({ appUrl: new URL("http://localhost:3000/some/path"), token }).href)
      .toBe("http://localhost:3000/invite/tok_abc-123");
  });

  it("encodes a token that is not URL-safe so it stays one path segment", () => {
    expect(mentorInvitationUrl({ appUrl, token: "a/b?c" }).pathname).toBe("/invite/a%2Fb%3Fc");
  });

  it("renders subject, text and html with the same absolute link, the bound address and the expiry", () => {
    const email = mentorInvitationEmail({ appUrl, email: "ada@example.com", token, expiresInDays: 14 });
    const link = "https://devmentor.test/invite/tok_abc-123";
    expect(email.subject).toBe("You're invited to mentor on DevMentor");
    expect(email.text).toContain(`\n${link}\n`);
    expect(email.text).toContain("with this email address (ada@example.com)");
    expect(email.text).toContain("Only an account with this verified address can accept");
    expect(email.text).toContain("The invitation expires in 14 days");
    expect(email.html).toContain(`<a href="${link}">Open your invitation</a>`);
    expect(email.html).toContain("expires in 14 days");
    expect(email.html).not.toMatch(/href="\//);
  });

  it("HTML-escapes interpolated values", () => {
    const email = mentorInvitationEmail({ appUrl, email: `"<b>"@example.com`, token, expiresInDays: 14 });
    expect(email.html).toContain("(&quot;&lt;b&gt;&quot;@example.com)");
    expect(email.html).not.toContain("<b>");
    expect(email.text).toContain(`("<b>"@example.com)`);
  });
});
