import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { asValue, createAppContainer, registerCore } from "@devmentor/core";
import { describe, expect, it, vi } from "vitest";

import { createAppConfig } from "@/server/config";

vi.mock("@/server/container", () => {
  const container = createAppContainer();
  registerCore(container);
  container.register({ principalResolver: asValue({ resolve: async () => null }) });
  return { container };
});

import { container } from "@/server/container";
import { navigationHandler } from "@/server/http";

const ctx = { params: Promise.resolve({}) };

describe("navigationHandler binding", () => {
  it("resolves internal redirects against APP_URL from config, not the request host", async () => {
    container.register({ config: asValue(createAppConfig({ APP_URL: "https://devmentor.example" })) });
    const GET = navigationHandler(async () => ({ redirectTo: "/account" }), { access: "public" });
    const response = await GET(new Request("http://evil.example/api/nav"), ctx);
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://devmentor.example/account");
  });

  it("lands on /error?code=internal_error when APP_URL is missing", async () => {
    container.register({ config: asValue(createAppConfig({})) });
    const GET = navigationHandler(async () => ({ redirectTo: "/account" }), { access: "public" });
    const response = await GET(new Request("http://evil.example/api/nav"), ctx);
    expect(response.headers.get("location")).toBe("/error?code=internal_error");
  });
});

// Platform P7: a browser navigation cannot carry the CSRF header, so the
// navigation wrapper only backs GET exports, and single-use confirmation or
// invitation tokens are never consumed on GET (their grants are POST-only
// through apiHandler).
describe("navigation routes", () => {
  const appDirectory = fileURLToPath(new URL("../app", import.meta.url));
  const routes = readdirSync(appDirectory, { recursive: true, encoding: "utf8" })
    .filter((file) => /(^|[/\\])route\.tsx?$/.test(file))
    .map((file) => ({ path: relative(appDirectory, join(appDirectory, file)), source: readFileSync(join(appDirectory, file), "utf8") }));

  it("finds the route files it guards", () => {
    expect(routes.map((route) => route.path)).toContain(join("api", "users", "route.ts"));
  });

  it("use navigationHandler for GET exports only", () => {
    for (const { path, source } of routes.filter((route) => route.source.includes("navigationHandler"))) {
      const exported = [...source.matchAll(/export\s+(?:const|async function|function)\s+(\w+)/g)].map((match) => match[1]);
      expect(exported, path).toEqual(["GET"]);
    }
  });

  it("never wrap confirmation or invitation grants in navigationHandler", () => {
    const grants = routes.filter((route) => /confirm-email|invitations?|invite/.test(route.path));
    for (const { path, source } of grants) expect(source, path).not.toContain("navigationHandler");
  });
});
