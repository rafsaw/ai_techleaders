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

  // Review fix R9: the auth pages that keep a `returnTo` are token pages by
  // route. A duplicate, dot-segment or percent-encoded nested invitation
  // returnTo must not drop the headers or the meta tags.
  const nested = [
    "",
    "?error=session_expired",
    "?returnTo=%2Faccount",
    "?returnTo=%2Finvite%2Fabc",
    "?error=github_cancelled&returnTo=%2Finvite%2Fabc",
    "?returnTo=%2Finvite%2Fabc&returnTo=%2Faccount",
    "?returnTo=%2Fx%2F..%2Finvite%2Fabc",
    "?returnTo=%2Fx%2F%252E%252E%2Finvite%2Fabc",
    "?returnTo=%2F%2569nvite%2Fabc",
  ];
  const authPages = ["/sign-in", "/sign-up", "/sign-up/check-email"];
  const join = (page: string, query: string) =>
    page === "/sign-up/check-email" ? `${page}?email=ada%40example.com${query.replace("?", "&")}` : `${page}${query}`;

  it.each(authPages.flatMap((page) => nested.map((query) => join(page, query))))(
    "serves %s as a no-referrer, no-store, noindex page",
    async (path) => {
      const response = await fetch(`${baseURL}${path}`, { redirect: "manual" });
      expect(response.status).toBe(200);
      expect(response.headers.get("referrer-policy")).toBe("no-referrer");
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
      const html = await response.text();
      expect(html).toContain('<meta name="referrer" content="no-referrer"/>');
      expect(html).toContain('<meta name="robots" content="noindex, nofollow"/>');
    },
  );

  it("leaves pages that keep no returnTo alone", async () => {
    const home = await fetch(`${baseURL}/?invitation=accepted`);
    expect(home.headers.get("referrer-policy")).toBeNull();
    expect(home.headers.get("x-robots-tag")).toBeNull();
    expect(await home.text()).not.toContain('<meta name="robots"');
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
