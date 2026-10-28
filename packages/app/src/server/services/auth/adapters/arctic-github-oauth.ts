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

/** `base` plus `path`, keeping any path prefix on `base` (e.g. GitHub Enterprise `/api/v3`). */
function endpoint(base: URL, path: string, search = ""): URL {
  const url = new URL(base);
  url.pathname = `${url.pathname.replace(/\/+$/, "")}${path}`;
  url.search = search;
  return url;
}

/**
 * The `GitHubOAuth` port on arctic's generic `OAuth2Client` with PKCE (S256)
 * (accounts AD1). Endpoints come from `config.github()`, so tests can point
 * them at a local stub. Every failure, including each arctic error class
 * (`OAuth2RequestError`, `ArcticFetchError`, `UnexpectedResponseError`,
 * `UnexpectedErrorResponseBodyError`), becomes a `GitHubOAuthError`.
 */
export class ArcticGitHubOAuth implements GitHubOAuth {
  private readonly config: Cradle["config"];

  constructor({ config }: Pick<Cradle, "config">) {
    this.config = config;
  }

  authorizationUrl(state: string, codeVerifier: string): URL {
    const { oauthUrl } = this.config.github();
    return this.#client().createAuthorizationURLWithPKCE(
      endpoint(oauthUrl, "/login/oauth/authorize").href,
      state,
      CodeChallengeMethod.S256,
      codeVerifier,
      SCOPES,
    );
  }

  async exchangeCode(code: string, codeVerifier: string): Promise<string> {
    const { oauthUrl } = this.config.github();
    try {
      const tokens = await this.#client().validateAuthorizationCode(
        endpoint(oauthUrl, "/login/oauth/access_token").href,
        code,
        codeVerifier,
      );
      // GitHub answers a rejected code with 200 and `{ error }`: no access token.
      return tokens.accessToken();
    } catch (error) {
      throw new GitHubOAuthError("GitHub token exchange failed", { cause: error });
    }
  }

  async fetchIdentity(accessToken: string): Promise<GitHubIdentity> {
    const { apiUrl } = this.config.github();
    const [user, emails] = await Promise.all([
      this.#get(endpoint(apiUrl, "/user"), accessToken, userSchema),
      this.#get(endpoint(apiUrl, "/user/emails", "per_page=100"), accessToken, emailsSchema),
    ]);
    return { id: String(user.id), login: user.login, name: user.name ?? null, emails };
  }

  async #get<T>(url: URL, accessToken: string, schema: z.ZodType<T>): Promise<T> {
    let body: unknown;
    try {
      const response = await fetch(url, {
        headers: {
          accept: "application/vnd.github+json",
          authorization: `Bearer ${accessToken}`,
          "user-agent": "devmentor",
          "x-github-api-version": "2022-11-28",
        },
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw new GitHubOAuthError(`GitHub API answered ${response.status}`);
      }
      body = await response.json();
    } catch (error) {
      if (error instanceof GitHubOAuthError) throw error;
      throw new GitHubOAuthError("GitHub API request failed", { cause: error });
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) throw new GitHubOAuthError("GitHub API returned an unexpected body");
    return parsed.data;
  }

  #client(): OAuth2Client {
    const { clientId, clientSecret } = this.config.github();
    const redirectUri = new URL(GITHUB_CALLBACK_PATH, this.config.app().url).href;
    return new OAuth2Client(clientId, clientSecret, redirectUri);
  }
}
