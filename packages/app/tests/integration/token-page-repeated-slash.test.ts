import { randomBytes } from "node:crypto";
import { request, type IncomingHttpHeaders } from "node:http";

import { describe, expect, inject, it } from "vitest";

// CANARY for a KNOWN LIMITATION (accounts review R11), not a protection.
//
// Next 16 answers any request whose path (before `?`) holds `//` or `\` with
// an immediate 308 to the normalized address (`\` -> `/`, `//+` -> `/`, query
// kept), with no headers of ours: it runs in `resolve-routes` (and
// `base-server`) before `headers()`, `redirects()`, the Proxy and the pages,
// and no config turns it off. So the 308 echoes a token page's token in
// `Location` without the platform P8 headers. The product owner accepted it
// as a documented limitation and a production release blocker: before
// production, the hosting edge must normalize such paths before the app or
// add `Cache-Control: no-store`, `Referrer-Policy: no-referrer` and
// `X-Robots-Tag: noindex, nofollow` to the app's 3xx responses.
//
// These tests pin today's behaviour. If one fails because Next starts sending
// the headers or stops redirecting, revisit R11 and its release condition in
// the accounts spec; do not "fix" the test.
//
// `fetch` (WHATWG URL) turns `\` into `/` before sending, so the requests go
// through `node:http` with the raw path, like `curl --path-as-is`.
// Read-only: no rows, no rate-limit buckets.

interface RawResponse {
  status: number;
  headers: IncomingHttpHeaders;
  body: string;
}

function rawGet(baseURL: string, path: string): Promise<RawResponse> {
  const { hostname, port } = new URL(baseURL);
  return new Promise((resolve, reject) => {
    const req = request({ hostname, port, path, method: "GET" }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk: string) => (body += chunk));
      res.on("end", () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body }));
      res.on("error", reject);
    });
    req.on("error", reject);
    req.end();
  });
}

describe("R11 canary: Next's repeated-slash/backslash 308 on token pages (production build)", () => {
  const baseURL = inject("baseURL");
  const token = randomBytes(32).toString("base64url");
  const returnTo = encodeURIComponent(`/invite/${token}`);

  // [template, raw path, Next's normalized Location, redirects still expected
  // after it (the Proxy's trailing-slash 308)]; the template names the test,
  // so no token reaches the report.
  const cases: [string, string, string, number][] = [
    ["/sign-in//?returnTo=<t>", `/sign-in//?returnTo=${returnTo}`, `/sign-in/?returnTo=${returnTo}`, 1],
    ["//sign-in?returnTo=<t>", `//sign-in?returnTo=${returnTo}`, `/sign-in?returnTo=${returnTo}`, 0],
    ["/invite//<t>", `/invite//${token}`, `/invite/${token}`, 0],
    ["/invite/<t>//", `/invite/${token}//`, `/invite/${token}/`, 1],
    ["/confirm-email//?token=<t>", `/confirm-email//?token=${token}`, `/confirm-email/?token=${token}`, 1],
    ["/sign-in\\?returnTo=<t>", `/sign-in\\?returnTo=${returnTo}`, `/sign-in/?returnTo=${returnTo}`, 1],
  ];

  function expectProtected(response: Response) {
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  }

  it.each(cases)("answers %s with Next's bare 308, without the P8 headers (known limitation)", async (_template, path, location) => {
    const response = await rawGet(baseURL, path);
    expect(response.status).toBe(308);
    expect(response.headers.location).toBe(location);
    expect(response.headers.refresh).toBe(`0;url=${location}`);
    expect(response.body).toBe(location);
    expect(response.headers["cache-control"]).toBeUndefined();
    expect(response.headers["referrer-policy"]).toBeUndefined();
    expect(response.headers["x-robots-tag"]).toBeUndefined();
  });

  it.each(cases)("then reaches a protected page from %s, every later hop protected", async (_template, path, location, hops) => {
    let next = new URL((await rawGet(baseURL, path)).headers.location!, baseURL);
    for (let hop = 0; hop < hops; hop++) {
      const redirect = await fetch(next, { redirect: "manual" });
      expect(redirect.status).toBe(308);
      expect(redirect.headers.get("location")).toBe(`${next.pathname.replace(/\/+$/, "")}${next.search}`);
      expectProtected(redirect);
      next = new URL(redirect.headers.get("location")!, baseURL);
    }
    expect(`${next.pathname}${next.search}`).toBe(location.replace(/\/(\?|$)/, "$1"));

    const page = await fetch(next, { redirect: "manual" });
    expect(page.status).toBe(200);
    expectProtected(page);
    const html = await page.text();
    expect(html).toContain('<meta name="referrer" content="no-referrer"/>');
    expect(html).toContain('<meta name="robots" content="noindex, nofollow"/>');
  });
});
