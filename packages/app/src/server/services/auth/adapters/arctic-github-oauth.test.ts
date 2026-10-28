import { createHash } from "node:crypto";

import {
  ArcticFetchError,
  OAuth2RequestError,
  UnexpectedErrorResponseBodyError,
  UnexpectedResponseError,
} from "arctic";
import { describe, expect, it, vi } from "vitest";

import { createAppConfig } from "@/server/config";
import { ArcticGitHubOAuth, GITHUB_CALLBACK_PATH } from "@/server/services/auth/adapters/arctic-github-oauth";
import { GitHubOAuthError } from "@/server/services/auth/github-oauth.port";

const VERIFIER = "v".repeat(43);

function adapter(env: Record<string, string> = {}) {
  const config = createAppConfig({
    APP_URL: "https://devmentor.example",
    GITHUB_CLIENT_ID: "client-id",
    GITHUB_CLIENT_SECRET: "client-secret",
    ...env,
  });
  return new ArcticGitHubOAuth({ config });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

/** Routes stubbed fetch calls by URL pathname. */
function stubFetch(handler: (url: URL, init: RequestInit | undefined, request?: Request) => Promise<Response> | Response) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    if (input instanceof Request) return handler(new URL(input.url), init, input);
    return handler(new URL(String(input)), init);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function exchangeFailure(response: () => Promise<Response> | Response) {
  stubFetch(() => response());
  const error = await adapter().exchangeCode("code", VERIFIER).catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(GitHubOAuthError);
  expect((error as Error).message).toBe("GitHub token exchange failed");
  expect((error as Error).name).toBe("GitHubOAuthError");
  return (error as Error).cause;
}

describe("arctic GitHub OAuth adapter", () => {
  it("builds the authorization URL with PKCE S256, user:email scope and the configured endpoint", () => {
    const url = adapter().authorizationUrl("state-1", VERIFIER);
    expect(url.origin + url.pathname).toBe("https://github.com/login/oauth/authorize");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      response_type: "code",
      client_id: "client-id",
      redirect_uri: `https://devmentor.example${GITHUB_CALLBACK_PATH}`,
      state: "state-1",
      code_challenge_method: "S256",
      code_challenge: createHash("sha256").update(VERIFIER).digest("base64url"),
      scope: "user:email",
    });
  });

  it("keeps a path prefix on the configured endpoints (stub or GitHub Enterprise)", () => {
    const url = adapter({ GITHUB_OAUTH_URL: "http://127.0.0.1:4010/github/" }).authorizationUrl("s", VERIFIER);
    expect(url.origin + url.pathname).toBe("http://127.0.0.1:4010/github/login/oauth/authorize");
  });

  it("exchanges the code with the verifier and client credentials and returns the access token", async () => {
    const fetchMock = stubFetch(async (url, _init, request) => {
      expect(url.href).toBe("https://stub.example/login/oauth/access_token");
      expect(request!.headers.get("authorization")).toBe(`Basic ${Buffer.from("client-id:client-secret").toString("base64")}`);
      const body = new URLSearchParams(await request!.text());
      expect(Object.fromEntries(body)).toEqual({
        grant_type: "authorization_code",
        code: "the-code",
        redirect_uri: `https://devmentor.example${GITHUB_CALLBACK_PATH}`,
        code_verifier: VERIFIER,
      });
      return json({ access_token: "gho_token", token_type: "bearer", scope: "user:email" });
    });
    await expect(adapter({ GITHUB_OAUTH_URL: "https://stub.example" }).exchangeCode("the-code", VERIFIER))
      .resolves.toBe("gho_token");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("maps an OAuth error response to GitHubOAuthError (OAuth2RequestError)", async () => {
    expect(await exchangeFailure(() => json({ error: "invalid_grant" }, 400))).toBeInstanceOf(OAuth2RequestError);
  });

  it("maps an unreachable token endpoint to GitHubOAuthError (ArcticFetchError)", async () => {
    expect(await exchangeFailure(() => { throw new TypeError("fetch failed"); })).toBeInstanceOf(ArcticFetchError);
  });

  it("maps an unexpected status to GitHubOAuthError (UnexpectedResponseError)", async () => {
    expect(await exchangeFailure(() => new Response("bad gateway", { status: 502 }))).toBeInstanceOf(UnexpectedResponseError);
  });

  it("maps an unreadable error body to GitHubOAuthError (UnexpectedErrorResponseBodyError)", async () => {
    expect(await exchangeFailure(() => json({ message: "no error field" }, 401))).toBeInstanceOf(UnexpectedErrorResponseBodyError);
  });

  it("maps GitHub's 200 response without an access token (a rejected code) to GitHubOAuthError", async () => {
    const cause = await exchangeFailure(() => json({ error: "bad_verification_code" }));
    expect(cause).toBeInstanceOf(Error);
  });

  it("reads /user and /user/emails with the token and maps them to an identity", async () => {
    const fetchMock = stubFetch((url, init) => {
      const headers = new Headers(init?.headers);
      expect(headers.get("authorization")).toBe("Bearer gho_token");
      expect(headers.get("accept")).toBe("application/vnd.github+json");
      expect(headers.get("user-agent")).toBe("devmentor");
      if (url.pathname === "/api/v3/user") return json({ id: 583231, login: "octocat", name: "The Octocat", extra: 1 });
      expect(url.pathname + url.search).toBe("/api/v3/user/emails?per_page=100");
      return json([{ email: "octo@example.com", primary: true, verified: true, visibility: "private" }]);
    });
    await expect(adapter({ GITHUB_API_URL: "https://ghe.example/api/v3" }).fetchIdentity("gho_token")).resolves.toEqual({
      id: "583231",
      login: "octocat",
      name: "The Octocat",
      emails: [{ email: "octo@example.com", primary: true, verified: true }],
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("reports a missing profile name as null", async () => {
    stubFetch((url) => (url.pathname === "/user" ? json({ id: 1, login: "octocat" }) : json([])));
    await expect(adapter().fetchIdentity("t")).resolves.toEqual({ id: "1", login: "octocat", name: null, emails: [] });
  });

  it.each([
    ["an error status with a body", () => new Response("unauthorized", { status: 401 }), "GitHub API answered 401"],
    ["an error status without a body", () => new Response(null, { status: 503 }), "GitHub API answered 503"],
    ["an unreachable API", () => { throw new TypeError("fetch failed"); }, "GitHub API request failed"],
    ["a non-JSON body", () => new Response("<html>", { status: 200 }), "GitHub API request failed"],
    ["an unexpected body", () => json({ id: "not-a-number", login: "x" }), "GitHub API returned an unexpected body"],
  ])("maps %s to GitHubOAuthError", async (_label, response, message) => {
    stubFetch((url) => (url.pathname === "/user" ? response() : json([])));
    await expect(adapter().fetchIdentity("t")).rejects.toEqual(new GitHubOAuthError(message));
  });
});
