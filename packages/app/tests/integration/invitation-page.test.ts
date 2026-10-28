import { randomBytes } from "node:crypto";

import { describe, expect, inject, it } from "vitest";

// Minimal server-rendering check of the invitation surfaces (E01 step 3.3).
// The full Flow 3 scenarios are in invitation-flow.test.ts and the four race
// tests in invitation-races.test.ts (step 3.4). Read-only: no rows.
describe("invitation page and API (production build)", () => {
  const baseURL = inject("baseURL");

  it("renders an unknown invitation as not valid, as a no-referrer, no-store, noindex page", async () => {
    const token = randomBytes(32).toString("base64url");
    const page = await fetch(`${baseURL}/invite/${token}`);
    expect(page.status).toBe(200);
    expect(page.headers.get("referrer-policy")).toBe("no-referrer");
    expect(page.headers.get("cache-control")).toBe("private, no-store");
    expect(page.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    const html = await page.text();
    expect(html).toContain('<meta name="referrer" content="no-referrer"/>');
    expect(html).toContain('<meta name="robots" content="noindex, nofollow"/>');
    expect(html).toContain("This invitation is not valid.");
    expect(html).toContain("Ask the DevMentor team for a new email.");
    expect(html).not.toContain("Accept invitation");
  });

  it("protects an auth page whose returnTo carries an invitation token, and only that one", async () => {
    const nested = await fetch(`${baseURL}/sign-in?returnTo=${encodeURIComponent("/invite/abc")}`);
    expect(nested.headers.get("referrer-policy")).toBe("no-referrer");
    expect(nested.headers.get("cache-control")).toBe("private, no-store");
    expect(await nested.text()).toContain('<meta name="robots" content="noindex, nofollow"/>');
    const plain = await fetch(`${baseURL}/sign-in?returnTo=%2Faccount`);
    expect(plain.headers.get("referrer-policy")).toBeNull();
    expect(await plain.text()).not.toContain('<meta name="robots"');
  });

  it("refuses an accept without a session (401) and shows no accepted notice to a signed-out visitor", async () => {
    const accept = await fetch(`${baseURL}/api/auth/invitations/accept`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-devmentor-csrf": "1" },
      body: JSON.stringify({ token: randomBytes(32).toString("base64url") }),
    });
    expect(accept.status).toBe(401);
    expect((await accept.json()).error.code).toBe("unauthorized");
    expect(await (await fetch(`${baseURL}/?invitation=accepted`)).text()).not.toContain("Invitation accepted.");
  });
});
