import { createHash } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import { createAppConfig } from "@/server/config";
import { ArcticGitHubOAuth, GITHUB_CALLBACK_PATH, GITHUB_REQUEST_TIMEOUT_MS } from "@/server/services/auth/adapters/arctic-github-oauth";
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
function stubFetch(handler: (url: URL, init: RequestInit | undefined) => Promise<Response> | Response) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => handler(new URL(String(input)), init));
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
    const fetchMock = stubFetch((url, init) => {
      expect(url.href).toBe("https://stub.example/login/oauth/access_token");
      expect(init?.method).toBe("POST");
      const headers = new Headers(init?.headers);
      expect(headers.get("authorization")).toBe(`Basic ${Buffer.from("client-id:client-secret").toString("base64")}`);
      expect(headers.get("content-type")).toBe("application/x-www-form-urlencoded");
      expect(headers.get("accept")).toBe("application/json");
      expect(headers.get("user-agent")).toBe("devmentor");
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      const body = new URLSearchParams(String(init?.body));
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

  it("maps an OAuth error status to GitHubOAuthError without reading the body", async () => {
    expect(await exchangeFailure(() => json({ error: "invalid_grant" }, 400)))
      .toEqual(new GitHubOAuthError("GitHub token endpoint answered 400"));
  });

  it("maps an unexpected status without a body to GitHubOAuthError", async () => {
    expect(await exchangeFailure(() => new Response(null, { status: 502 })))
      .toEqual(new GitHubOAuthError("GitHub token endpoint answered 502"));
  });

  it("maps an unreachable token endpoint to GitHubOAuthError", async () => {
    expect(await exchangeFailure(() => { throw new TypeError("fetch failed"); })).toBeInstanceOf(TypeError);
  });

  it("maps a non-JSON token response to GitHubOAuthError", async () => {
    expect(await exchangeFailure(() => new Response("<html>", { status: 200 }))).toBeInstanceOf(SyntaxError);
  });

  it("maps GitHub's 200 response without an access token (a rejected code) to GitHubOAuthError", async () => {
    expect(await exchangeFailure(() => json({ error: "bad_verification_code" })))
      .toEqual(new GitHubOAuthError("GitHub token endpoint returned no access token"));
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

/** A fetch answer that never comes, until the request's signal aborts (as undici does). */
function stalled(init: RequestInit | undefined): Promise<Response> {
  const signal = init?.signal;
  return new Promise((_resolve, reject) => {
    signal?.addEventListener("abort", () => reject(signal.reason as Error));
  });
}

/** Headers now, then a body that never finishes, until the request's signal aborts. */
function stalledBody(init: RequestInit | undefined): Response {
  const signal = init?.signal;
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('{"a'));
      signal?.addEventListener("abort", () => controller.error(signal.reason));
    },
  });
  return new Response(body, { status: 200, headers: { "content-type": "application/json" } });
}

describe("arctic GitHub OAuth adapter timeouts (R13)", () => {
  const TIMEOUT_MS = 50;

  function bounded(timeoutMs = TIMEOUT_MS) {
    const config = createAppConfig({
      APP_URL: "https://devmentor.example",
      GITHUB_CLIENT_ID: "client-id",
      GITHUB_CLIENT_SECRET: "client-secret",
    });
    return new ArcticGitHubOAuth({ config }, { timeoutMs });
  }

  it("defaults to a 10 second bound per GitHub call", () => {
    expect(GITHUB_REQUEST_TIMEOUT_MS).toBe(10_000);
  });

  it.each([
    ["sends no headers", stalled],
    ["sends headers, then stalls the body", stalledBody],
  ])("rejects a token endpoint that %s with GitHubOAuthError", async (_label, answer) => {
    stubFetch((_url, init) => answer(init));
    const error = await bounded().exchangeCode("code", VERIFIER).catch((caught: unknown) => caught);
    expect(error).toEqual(new GitHubOAuthError("GitHub token exchange failed"));
    expect((error as Error).cause).toMatchObject({ name: "TimeoutError" });
  });

  it.each([
    ["/user", "sends no headers", stalled],
    ["/user/emails", "sends no headers", stalled],
    ["/user", "sends headers, then stalls the body", stalledBody],
    ["/user/emails", "sends headers, then stalls the body", stalledBody],
  ])("rejects when %s %s, and aborts the sibling request", async (path, _label, answer) => {
    const signals: AbortSignal[] = [];
    stubFetch((url, init) => {
      signals.push(init!.signal!);
      return url.pathname === path ? answer(init) : stalled(init);
    });
    const error = await bounded().fetchIdentity("t").catch((caught: unknown) => caught);
    expect(error).toEqual(new GitHubOAuthError("GitHub API request failed"));
    expect((error as Error).cause).toMatchObject({ name: "TimeoutError" });
    expect(signals).toHaveLength(2);
    expect(signals.every((signal) => signal.aborted)).toBe(true);
  });

  it("aborts the sibling request as soon as one fails", async () => {
    const signals: AbortSignal[] = [];
    stubFetch((url, init) => {
      signals.push(init!.signal!);
      return url.pathname === "/user" ? new Response(null, { status: 503 }) : stalled(init);
    });
    // A bound far beyond the test timeout: only the sibling abort can end the stalled request.
    await expect(bounded(600_000).fetchIdentity("t")).rejects.toEqual(new GitHubOAuthError("GitHub API answered 503"));
    expect(signals.map((signal) => signal.aborted)).toEqual([true, true]);
  });
});
