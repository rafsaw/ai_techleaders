// The GitHub OAuth port. Callers (GitHubSignInService) depend on this
// interface only; the arctic adapter in `adapters/` implements it, so no
// caller imports a vendor SDK and tests can substitute the provider.

/** One address from GitHub's `GET /user/emails`. */
export interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

/** The GitHub user behind an access token. */
export interface GitHubIdentity {
  /** GitHub's stable numeric user id, as a string. */
  id: string;
  login: string;
  /** The profile name; GitHub returns null when the person never set one. */
  name: string | null;
  emails: GitHubEmail[];
}

/**
 * Any provider-side failure: an unreachable endpoint, a rejected code, an
 * unexpected response. The message is generic; the vendor error is only the
 * `cause`, because provider messages can embed URLs and codes.
 */
export class GitHubOAuthError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "GitHubOAuthError";
  }
}

export interface GitHubOAuth {
  /** The provider's authorization URL with `state`, PKCE (S256) and scope `user:email`. */
  authorizationUrl(state: string, codeVerifier: string): URL;
  /** Exchanges an authorization code for an access token, or throws `GitHubOAuthError`. */
  exchangeCode(code: string, codeVerifier: string): Promise<string>;
  /**
   * Reads `/user` and `/user/emails` with the access token, or throws
   * `GitHubOAuthError`. The token is used once and never stored.
   */
  fetchIdentity(accessToken: string): Promise<GitHubIdentity>;
}
