import { describe, expect, it } from "vitest";

import {
  emailConfirmationEmail,
  emailConfirmationUrl,
} from "@/server/services/notifications/templates/email-confirmation";

const appUrl = new URL("https://devmentor.test");
const token = "tok_abc-123";

describe("email confirmation template", () => {
  it("links absolutely to /confirm-email with the token and returnTo", () => {
    const url = emailConfirmationUrl({ appUrl, token, returnTo: "/invite/secret?x=1&y=2" });
    expect(url.origin).toBe("https://devmentor.test");
    expect(url.pathname).toBe("/confirm-email");
    expect(url.searchParams.get("token")).toBe(token);
    expect(url.searchParams.get("returnTo")).toBe("/invite/secret?x=1&y=2");
  });

  it("omits returnTo when there is none and ignores any path on APP_URL", () => {
    const url = emailConfirmationUrl({ appUrl: new URL("http://localhost:3000/some/path"), token });
    expect(url.href).toBe(`http://localhost:3000/confirm-email?token=${token}`);
  });

  it("renders subject, text and html with the same absolute link", () => {
    const email = emailConfirmationEmail({ appUrl, displayName: "Ada", token, returnTo: "/account", expiresInHours: 24 });
    const link = "https://devmentor.test/confirm-email?token=tok_abc-123&returnTo=%2Faccount";
    expect(email.subject).toBe("Confirm your email address for DevMentor");
    expect(email.text).toContain("Hi Ada,");
    expect(email.text).toContain(`\n${link}\n`);
    expect(email.text).toContain("enter the password you chose");
    expect(email.text).toContain("The link expires in 24 hours.");
    expect(email.html).toContain(`<a href="${link.replace("&", "&amp;")}">Confirm your email address</a>`);
    expect(email.html).toContain("The link expires in 24 hours.");
    // No relative links anywhere.
    expect(email.html).not.toMatch(/href="\//);
  });

  it("HTML-escapes interpolated values", () => {
    const email = emailConfirmationEmail({ appUrl, displayName: `<script>alert("x")</script> & Co`, token, expiresInHours: 24 });
    expect(email.html).toContain("Hi &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; Co,");
    expect(email.html).not.toContain("<script>");
    // The plain-text part is not HTML, so it keeps the name as typed.
    expect(email.text).toContain(`Hi <script>alert("x")</script> & Co,`);
  });
});
