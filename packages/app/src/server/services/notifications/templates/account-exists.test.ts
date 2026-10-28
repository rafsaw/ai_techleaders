import { describe, expect, it } from "vitest";

import { accountExistsEmail, accountExistsSignInUrl } from "@/server/services/notifications/templates/account-exists";

const appUrl = new URL("https://devmentor.test/ignored/path");

describe("account exists template", () => {
  it("links absolutely to /sign-in, keeping returnTo when given", () => {
    expect(accountExistsSignInUrl({ appUrl }).href).toBe("https://devmentor.test/sign-in");
    expect(accountExistsSignInUrl({ appUrl, returnTo: "/invite/x?y=1" }).href)
      .toBe("https://devmentor.test/sign-in?returnTo=%2Finvite%2Fx%3Fy%3D1");
  });

  it("offers sign-in with GitHub or the password and no reset (N03)", () => {
    const email = accountExistsEmail({ appUrl, displayName: "Ada", returnTo: "/account" });
    const link = "https://devmentor.test/sign-in?returnTo=%2Faccount";
    expect(email.subject).toBe("You already have a DevMentor account");
    expect(email.text).toContain("Hi Ada,");
    expect(email.text).toContain("Sign in with GitHub or with your password:");
    expect(email.text).toContain(`\n${link}\n`);
    expect(email.text).toContain("Password reset is not available yet.");
    expect(email.html).toContain(`<a href="${link}">Sign in to DevMentor</a>`);
    expect(email.html).not.toMatch(/href="\//);
    expect(`${email.text}${email.html}`).not.toMatch(/reset your password|confirm-email/i);
  });

  it("HTML-escapes the display name", () => {
    const email = accountExistsEmail({ appUrl, displayName: "<b>Ada</b> & Co" });
    expect(email.html).toContain("Hi &lt;b&gt;Ada&lt;/b&gt; &amp; Co,");
    expect(email.text).toContain("Hi <b>Ada</b> & Co,");
  });
});
