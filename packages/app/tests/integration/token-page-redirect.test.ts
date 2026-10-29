import { randomBytes } from "node:crypto";

import { describe, expect, inject, it } from "vitest";

// Review fix R10: a trailing slash on a token page used to get Next's
// automatic 308 to the slash-less address, which echoes the token (in the
// path or a nested `returnTo`) in `Location` but carried none of the platform
// P8 headers. Read-only: no rows, no rate-limit buckets.
describe("trailing-slash redirects of token pages (production build)", () => {
  const baseURL = inject("baseURL");
  const token = randomBytes(32).toString("base64url");
  const returnTo = encodeURIComponent(`/invite/${token}`);

  // [route, path, query] of every TOKEN_PAGES route, each carrying a token;
  // the route names the test, so no token reaches the report.
  const pages: [string, string, string][] = [
    ["/confirm-email", "/confirm-email", `?token=${token}`],
    ["/invite/:token", `/invite/${token}`, ""],
    ["/sign-in", "/sign-in", `?returnTo=${returnTo}`],
    ["/sign-up", "/sign-up", `?returnTo=${returnTo}`],
    ["/sign-up/check-email", "/sign-up/check-email", `?email=ada%40example.com&returnTo=${returnTo}`],
  ];

  function expectProtected(response: Response) {
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  }

  async function expectProtectedPage(response: Response) {
    expect(response.status).toBe(200);
    expectProtected(response);
    const html = await response.text();
    expect(html).toContain('<meta name="referrer" content="no-referrer"/>');
    expect(html).toContain('<meta name="robots" content="noindex, nofollow"/>');
  }

  it.each(pages)("redirects %s/ with the token-page headers, to a protected page", async (_route, path, query) => {
    const redirect = await fetch(`${baseURL}${path}/${query}`, { redirect: "manual" });
    expect(redirect.status).toBe(308);
    expect(redirect.headers.get("location")).toBe(`${path}${query}`);
    expectProtected(redirect);

    await expectProtectedPage(await fetch(new URL(redirect.headers.get("location")!, baseURL), { redirect: "manual" }));
  });

  it.each(pages)("serves %s directly as a protected page", async (_route, path, query) => {
    await expectProtectedPage(await fetch(`${baseURL}${path}${query}`, { redirect: "manual" }));
  });

  it("redirects an RSC request for a token page with the headers too", async () => {
    const redirect = await fetch(`${baseURL}/sign-in/?returnTo=${returnTo}`, { redirect: "manual", headers: { rsc: "1" } });
    expect(redirect.status).toBe(308);
    expect(redirect.headers.get("location")).toBe(`/sign-in?returnTo=${returnTo}`);
    expectProtected(redirect);
  });

  // Every other path keeps Next's slash-less canonical form.
  it.each(["/account/", "/sign-in/x/", "/api/users/", "/api/auth/github/?returnTo=%2F", "/favicon.ico/"])(
    "still redirects %s to its slash-less address",
    async (path) => {
      const redirect = await fetch(`${baseURL}${path}`, { redirect: "manual" });
      expect(redirect.status).toBe(308);
      expect(redirect.headers.get("location")).toBe(path.replace(/\/(\?|$)/, "$1"));
    },
  );

  it("leaves slash-less pages and the home page alone", async () => {
    for (const path of ["/", "/account"]) {
      const response = await fetch(`${baseURL}${path}`, { redirect: "manual" });
      expect(response.status, path).not.toBe(308);
      expect(response.headers.get("x-robots-tag"), path).toBeNull();
    }
  });
});
