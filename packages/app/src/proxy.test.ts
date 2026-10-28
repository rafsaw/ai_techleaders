import { readFileSync } from "node:fs";

import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Proxy must never load the DB, the container or a service: renewal is
// cookie-only. Importing any of these would fail the test file.
vi.mock("@devmentor/db", () => { throw new Error("Proxy imported @devmentor/db"); });
vi.mock("@/server/container", () => { throw new Error("Proxy imported the container"); });
vi.mock("@/server/http", () => { throw new Error("Proxy imported the HTTP wrappers"); });
vi.mock("@/server/auth/page-guards", () => { throw new Error("Proxy imported the page guards"); });

// The config is memoized per module instance, so each test loads a fresh one.
let proxyModule: typeof import("@/proxy");
async function load(appUrl: string) {
  vi.stubEnv("APP_URL", appUrl);
  vi.resetModules();
  proxyModule = await import("@/proxy");
}

const TOKEN = "A".repeat(43);

function call(path: string, cookie?: string, headers: Record<string, string> = {}) {
  const request = new NextRequest(`http://localhost:3000${path}`, { headers: cookie ? { ...headers, cookie } : headers });
  return proxyModule.proxy(request);
}

/** A pass-through response: no redirect, rewrite or direct answer. */
function expectPassThrough(response: Response) {
  expect(response.headers.get("x-middleware-next")).toBe("1");
  expect(response.headers.get("location")).toBeNull();
  expect(response.headers.get("x-middleware-rewrite")).toBeNull();
  expect(response.status).toBe(200);
}

beforeEach(() => load("http://localhost:3000"));

describe("cookie-only Proxy", () => {
  it.each([
    ["a document request", {}],
    ["an RSC navigation", { rsc: "1" }],
    ["a prefetch", { rsc: "1", "next-router-prefetch": "1" }],
  ])("renews the session cookie on %s with its security attributes", (_label, headers) => {
    const response = call("/account", `devmentor_session=${TOKEN}; other=1`, headers);
    expectPassThrough(response);
    expect(response.headers.getSetCookie()).toEqual([
      `devmentor_session=${TOKEN}; Max-Age=2592000; Path=/; HttpOnly; SameSite=Lax`,
    ]);
  });

  it("renews the __Host- cookie with Secure on an https APP_URL", async () => {
    await load("https://devmentor.example");
    const response = call("/", `__Host-devmentor_session=${TOKEN}`);
    expect(response.headers.getSetCookie()).toEqual([
      `__Host-devmentor_session=${TOKEN}; Max-Age=2592000; Path=/; HttpOnly; Secure; SameSite=Lax`,
    ]);
  });

  it("does nothing without a session cookie, and does not read config", async () => {
    await load("");
    for (const cookie of [undefined, "other=1"]) {
      const response = call("/account", cookie);
      expectPassThrough(response);
      expect(response.headers.getSetCookie()).toEqual([]);
    }
  });

  it("does not renew a malformed token or a cookie under the other scheme's name", () => {
    expect(call("/", "devmentor_session=short").headers.getSetCookie()).toEqual([]);
    expect(call("/", `__Host-devmentor_session=${TOKEN}`).headers.getSetCookie()).toEqual([]);
  });

  it("skips renewal (but still passes the request through) when APP_URL is missing", async () => {
    await load("");
    const response = call("/error", `devmentor_session=${TOKEN}`);
    expectPassThrough(response);
    expect(response.headers.getSetCookie()).toEqual([]);
  });

  it("excludes APIs and static resources even if invoked", () => {
    for (const path of ["/api", "/api/users", "/_next/static/chunk.js", "/_next/image", "/favicon.ico", "/logo.png"]) {
      expect(call(path, `devmentor_session=${TOKEN}`).headers.getSetCookie()).toEqual([]);
    }
    expect(call("/apiary", `devmentor_session=${TOKEN}`).headers.getSetCookie()).toHaveLength(1);
  });

  it("matches pages only", () => {
    const matches = (url: string) => unstable_doesMiddlewareMatch({ config: proxyModule.config, url });
    for (const url of ["/", "/account", "/backend/users", "/sign-in?returnTo=%2F", "/apiary", "/error"]) {
      expect(matches(url), url).toBe(true);
    }
    for (const url of ["/api", "/api/users", "/api/auth/github/callback", "/_next/static/chunk.js", "/_next/image?url=x", "/favicon.ico", "/robots.txt"]) {
      expect(matches(url), url).toBe(false);
    }
  });

  it("cannot authorize: it never redirects, rewrites or blocks, whatever the cookie", () => {
    for (const cookie of [undefined, `devmentor_session=${TOKEN}`, `devmentor_session=${"B".repeat(43)}`]) {
      expectPassThrough(call("/backend", cookie));
    }
  });

  it("imports only cookie and config helpers", () => {
    const source = readFileSync(new URL("./proxy.ts", import.meta.url), "utf8");
    const imports = [...source.matchAll(/from "([^"]+)"/g)].map((match) => match[1]);
    expect(imports).toEqual(["@devmentor/core", "next/server", "@/server/auth/session-cookie", "@/server/config"]);
  });
});
