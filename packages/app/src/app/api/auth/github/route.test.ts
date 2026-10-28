import { asClass, asValue, createAppContainer, registerCore } from "@devmentor/core";
import { describe, expect, it, vi } from "vitest";

import { createAppConfig } from "@/server/config";
import { GitHubSignInService, OAUTH_COOKIE } from "@/server/services/auth/github-sign-in.service";

vi.mock("@/server/container", () => {
  const container = createAppContainer();
  registerCore(container);
  container.register({ principalResolver: asValue({ resolve: async () => null }) });
  return { container };
});

import { container } from "@/server/container";

import { GET as callback } from "./callback/route";
import { GET as start } from "./route";

const ctx = { params: Promise.resolve({}) };
const APP = "https://devmentor.example";

function register(env: Record<string, string> = {}, authorize = "https://github.com/login/oauth/authorize") {
  container.register({
    config: asValue(createAppConfig({ APP_URL: APP, GITHUB_CLIENT_ID: "id", GITHUB_CLIENT_SECRET: "secret", ...env })),
    em: asValue({}),
    authSessionService: asValue({ start: vi.fn() }),
    githubOAuth: asValue({
      authorizationUrl: (state: string) => new URL(`${authorize}?state=${state}`),
      exchangeCode: vi.fn(),
      fetchIdentity: vi.fn(),
    }),
    githubSignInService: asClass(GitHubSignInService),
  } as never);
}

/** The OAuth cookie's `name=value` pair from a start response. */
function oauthCookie(response: Response): string {
  const header = response.headers.getSetCookie().find((value) => value.startsWith(`${OAUTH_COOKIE}=`))!;
  return header.split(";")[0]!;
}

describe("GET /api/auth/github", () => {
  it("sets the OAuth cookie and redirects to the configured GitHub origin with 303", async () => {
    register();
    const response = await start(new Request("http://evil.example/api/auth/github?returnTo=%2Fmentors"), ctx);
    expect(response.status).toBe(303);
    const location = new URL(response.headers.get("location")!);
    expect(location.origin + location.pathname).toBe("https://github.com/login/oauth/authorize");
    expect(location.searchParams.get("state")).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(oauthCookie(response)).toMatch(new RegExp(`^${OAUTH_COOKIE}=.+`));
  });

  it("refuses an authorization URL outside the configured OAuth origin", async () => {
    register({}, "https://phish.example/authorize");
    const response = await start(new Request(`${APP}/api/auth/github`), ctx);
    expect(response.headers.get("location")).toBe(`${APP}/error?code=internal_error`);
  });

  it("lands on /error?code=internal_error when GitHub is not configured", async () => {
    register();
    container.register({ config: asValue(createAppConfig({ APP_URL: APP })) });
    const response = await start(new Request(`${APP}/api/auth/github`), ctx);
    expect(response.headers.get("location")).toBe(`${APP}/error?code=internal_error`);
  });
});

describe("GET /api/auth/github/callback", () => {
  it("keeps the safe returnTo through a cancellation and clears the OAuth cookie", async () => {
    register();
    const begun = await start(new Request(`${APP}/api/auth/github?returnTo=%2Finvitations%2Fabc`), ctx);
    const state = new URL(begun.headers.get("location")!).searchParams.get("state")!;
    const response = await callback(new Request(`${APP}/api/auth/github/callback?error=access_denied&state=${state}`, {
      headers: { cookie: oauthCookie(begun) },
    }), ctx);
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(`${APP}/sign-in?error=github_cancelled&returnTo=%2Finvitations%2Fabc`);
    const cleared = response.headers.getSetCookie().find((value) => value.startsWith(`${OAUTH_COOKIE}=`));
    expect(cleared).toContain("Max-Age=0");
    expect(cleared).toContain("Path=/api/auth/github");
  });

  it("sends a callback without the OAuth cookie to github_failed", async () => {
    register();
    const response = await callback(new Request(`${APP}/api/auth/github/callback?code=c&state=s`), ctx);
    expect(response.headers.get("location")).toBe(`${APP}/sign-in?error=github_failed`);
    expect(response.headers.getSetCookie().some((value) => value.startsWith(`${OAUTH_COOKIE}=;`))).toBe(true);
  });
});
