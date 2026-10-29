import type { Cradle } from "@devmentor/core";
import { CodeChallengeMethod, OAuth2Client } from "arctic";
import { z } from "zod";

import {
  GitHubOAuthError,
  type GitHubIdentity,
  type GitHubOAuth,
} from "@/server/services/auth/github-oauth.port";

/** The callback GitHub returns to; registered on the OAuth App. */
export const GITHUB_CALLBACK_PATH = "/api/auth/github/callback";

const SCOPES = ["user:email"];

const userSchema = z.object({
  id: z.number().int().positive(),
  login: z.string().min(1),
  name: z.string().nullable().optional(),
});

const emailsSchema = z.array(
  z.object({ email: z.string(), primary: z.boolean(), verified: z.boolean() }),
);

/**
 * The bound on each GitHub step (R13): the token exchange, and `/user` plus
 * `/user/emails` together. It covers the response body too, so a provider
 * that stalls before or after its headers fails as `github_failed` instead of
 * holding the callback open.
 */
export const GITHUB_REQUEST_TIMEOUT_MS = 10_000;

const USER_AGENT = "devmentor";

/** GitHub answers a rejected code with 200 and `{ error }`: no access token. */
const tokenSchema = z.object({ access_token: z.string().min(1) });

/** `base` plus `path`, keeping any path prefix on `base` (e.g. GitHub Enterprise `/api/v3`). */
function endpoint(base: URL, path: string, search = ""): URL {
  const url = new URL(base);
  url.pathname = `${url.pathname.replace(/\/+$/, "")}${path}`;
  url.search = search;
  return url;
}

/**
 * One GitHub request and its JSON body under `signal`. Aborting rejects the
 * pending fetch or the body read and releases the connection.
 */
async function readJson(url: URL, init: RequestInit, signal: AbortSignal, name: string): Promise<unknown> {
  const response = await fetch(url, { ...init, signal });
  if (!response.ok) {
    await response.body?.cancel();
    throw new GitHubOAuthError(`${name} answered ${response.status}`);
  }
  return response.json();
}

/**
 * The `GitHubOAuth` port (accounts AD1). arctic's generic `OAuth2Client`
 * builds the authorization URL with PKCE (S256); the token exchange and the
 * API reads are plain `fetch` calls, because arctic's token request takes no
 * `AbortSignal` (R13). Each step is bounded by `GITHUB_REQUEST_TIMEOUT_MS`.
 * Endpoints come from `config.github()`, so tests can point them at a local
 * stub. Every failure, a timeout included, becomes a `GitHubOAuthError` with a
 * generic message and the underlying error only as its `cause`.
 */
export class ArcticGitHubOAuth implements GitHubOAuth {
  private readonly config: Cradle["config"];
  private readonly timeoutMs: number;

  /** `timeoutMs` exists for tests; the container passes only the cradle. */
  constructor({ config }: Pick<Cradle, "config">, { timeoutMs = GITHUB_REQUEST_TIMEOUT_MS }: { timeoutMs?: number } = {}) {
    this.config = config;
    this.timeoutMs = timeoutMs;
  }

  authorizationUrl(state: string, codeVerifier: string): URL {
    const { oauthUrl, clientId, clientSecret } = this.config.github();
    return new OAuth2Client(clientId, clientSecret, this.#redirectUri()).createAuthorizationURLWithPKCE(
      endpoint(oauthUrl, "/login/oauth/authorize").href,
      state,
      CodeChallengeMethod.S256,
      codeVerifier,
      SCOPES,
    );
  }

  async exchangeCode(code: string, codeVerifier: string): Promise<string> {
    const { oauthUrl, clientId, clientSecret } = this.config.github();
    try {
      const body = await readJson(endpoint(oauthUrl, "/login/oauth/access_token"), {
        method: "POST",
        headers: {
          accept: "application/json",
          authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
          "content-type": "application/x-www-form-urlencoded",
          "user-agent": USER_AGENT,
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: this.#redirectUri(),
          code_verifier: codeVerifier,
        }),
      }, AbortSignal.timeout(this.timeoutMs), "GitHub token endpoint");
      const parsed = tokenSchema.safeParse(body);
      if (!parsed.success) throw new GitHubOAuthError("GitHub token endpoint returned no access token");
      return parsed.data.access_token;
    } catch (error) {
      throw new GitHubOAuthError("GitHub token exchange failed", { cause: error });
    }
  }

  async fetchIdentity(accessToken: string): Promise<GitHubIdentity> {
    const { apiUrl } = this.config.github();
    // One deadline for both reads; the first failure cancels the other.
    const failed = new AbortController();
    const signal = AbortSignal.any([AbortSignal.timeout(this.timeoutMs), failed.signal]);
    const get = <T>(url: URL, schema: z.ZodType<T>) => this.#get(url, accessToken, schema, signal).catch((error: unknown) => {
      failed.abort();
      throw error;
    });
    const [user, emails] = await Promise.all([
      get(endpoint(apiUrl, "/user"), userSchema),
      get(endpoint(apiUrl, "/user/emails", "per_page=100"), emailsSchema),
    ]);
    return { id: String(user.id), login: user.login, name: user.name ?? null, emails };
  }

  async #get<T>(url: URL, accessToken: string, schema: z.ZodType<T>, signal: AbortSignal): Promise<T> {
    let body: unknown;
    try {
      body = await readJson(url, {
        headers: {
          accept: "application/vnd.github+json",
          authorization: `Bearer ${accessToken}`,
          "user-agent": USER_AGENT,
          "x-github-api-version": "2022-11-28",
        },
      }, signal, "GitHub API");
    } catch (error) {
      if (error instanceof GitHubOAuthError) throw error;
      throw new GitHubOAuthError("GitHub API request failed", { cause: error });
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) throw new GitHubOAuthError("GitHub API returned an unexpected body");
    return parsed.data;
  }

  #redirectUri(): string {
    return new URL(GITHUB_CALLBACK_PATH, this.config.app().url).href;
  }
}
