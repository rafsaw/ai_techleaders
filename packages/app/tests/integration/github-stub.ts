import { createHash, randomBytes } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

/** What the stub's `/user` and `/user/emails` report for the next authorizations. */
export interface StubGitHubUser {
  id: number;
  login: string;
  name: string | null;
  emails: { email: string; primary: boolean; verified: boolean }[];
}

export interface GitHubStub {
  /** Base URL for both `GITHUB_OAUTH_URL` and `GITHUB_API_URL`. */
  url: string;
  close(): Promise<void>;
}

/** Query parameter that answers the authorize screen without a browser click. */
export const STUB_DECISION_PARAM = "stub_decision";

const DEFAULT_USER: StubGitHubUser = {
  id: 1000001,
  login: "octocat",
  name: "The Octocat",
  emails: [{ email: "octocat@example.com", primary: true, verified: true }],
};

type Grant = { challenge: string; redirectUri: string; user: StubGitHubUser };

function send(response: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}): void {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  response.writeHead(status, {
    "content-type": typeof body === "string" ? "text/html; charset=utf-8" : "application/json",
    ...headers,
  });
  response.end(text);
}

function redirect(response: ServerResponse, location: URL): void {
  response.writeHead(302, { location: location.href });
  response.end();
}

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/**
 * A local stand-in for GitHub's OAuth and REST endpoints, used by the
 * integration tests through `GITHUB_OAUTH_URL`/`GITHUB_API_URL`:
 *
 * - `GET /login/oauth/authorize`: an approve/cancel screen (two links), or an
 *   immediate answer with `stub_decision=approve|deny` for HTTP-driven tests;
 * - `POST /login/oauth/access_token`: checks the client credentials, the
 *   redirect URI and the PKCE S256 verifier; codes are single-use; failures
 *   answer 200 with `{ error }` like GitHub does;
 * - `GET /user`, `GET /user/emails`: the identity bound to the access token;
 * - `POST /__stub/user`: sets the identity for subsequent authorizations;
 * - `POST /__stub/barrier`: holds the next `count` `/user/emails` answers
 *   until all of them have arrived, so concurrent callbacks reach account
 *   resolution at the same moment (race tests).
 */
export async function startGitHubStub({ clientId, clientSecret }: { clientId: string; clientSecret: string }): Promise<GitHubStub> {
  let currentUser = DEFAULT_USER;
  const grants = new Map<string, Grant>();
  const tokens = new Map<string, StubGitHubUser>();
  let barrier: { remaining: number; waiting: (() => void)[] } | undefined;

  const passBarrier = async () => {
    if (!barrier) return;
    const current = barrier;
    current.remaining -= 1;
    if (current.remaining > 0) {
      await new Promise<void>((resolve) => current.waiting.push(resolve));
      return;
    }
    barrier = undefined;
    for (const release of current.waiting) release();
  };

  const authorize = (url: URL, response: ServerResponse) => {
    const redirectUri = url.searchParams.get("redirect_uri");
    const state = url.searchParams.get("state");
    const challenge = url.searchParams.get("code_challenge");
    if (url.searchParams.get("client_id") !== clientId || !redirectUri || !state || !challenge
      || url.searchParams.get("code_challenge_method") !== "S256" || url.searchParams.get("scope") !== "user:email") {
      send(response, 400, "<h1>Invalid authorization request</h1>");
      return;
    }
    const target = new URL(redirectUri);
    target.searchParams.set("state", state);
    const decision = url.searchParams.get(STUB_DECISION_PARAM);
    if (decision === "deny") {
      target.searchParams.set("error", "access_denied");
      target.searchParams.set("error_description", "The user has denied your application access.");
      redirect(response, target);
    } else if (decision === "approve") {
      const code = randomBytes(16).toString("hex");
      grants.set(code, { challenge, redirectUri, user: currentUser });
      target.searchParams.set("code", code);
      redirect(response, target);
    } else {
      const choice = (value: string) => {
        const next = new URL(url);
        next.searchParams.set(STUB_DECISION_PARAM, value);
        return escapeHtml(`${next.pathname}${next.search}`);
      };
      send(response, 200, `<!doctype html><title>Authorize DevMentor</title><main><h1>Authorize DevMentor</h1>`
        + `<p>Signed in to the GitHub stub as ${escapeHtml(currentUser.login)}</p>`
        + `<a href="${choice("approve")}">Authorize</a> <a href="${choice("deny")}">Cancel</a></main>`);
    }
  };

  const exchange = async (request: IncomingMessage, response: ServerResponse) => {
    const body = new URLSearchParams(await readBody(request));
    const expected = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
    if (request.headers.authorization !== expected) {
      send(response, 200, { error: "incorrect_client_credentials" });
      return;
    }
    const code = body.get("code") ?? "";
    const grant = grants.get(code);
    grants.delete(code);
    const verifier = body.get("code_verifier") ?? "";
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    if (!grant || grant.redirectUri !== body.get("redirect_uri") || grant.challenge !== challenge) {
      send(response, 200, { error: "bad_verification_code" });
      return;
    }
    const token = `gho_${randomBytes(16).toString("hex")}`;
    tokens.set(token, grant.user);
    send(response, 200, { access_token: token, token_type: "bearer", scope: "user:email" });
  };

  const server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://stub.invalid");
    const route = `${request.method} ${url.pathname}`;
    const bearer = request.headers.authorization?.replace(/^Bearer /, "") ?? "";
    void (async () => {
      if (route === "GET /login/oauth/authorize") return authorize(url, response);
      if (route === "POST /login/oauth/access_token") return exchange(request, response);
      if (route === "POST /__stub/user") {
        currentUser = JSON.parse(await readBody(request)) as StubGitHubUser;
        return send(response, 204, "");
      }
      if (route === "POST /__stub/barrier") {
        const { count } = JSON.parse(await readBody(request)) as { count: number };
        barrier = { remaining: count, waiting: [] };
        return send(response, 204, "");
      }
      if (route === "GET /user" || route === "GET /user/emails") {
        const user = tokens.get(bearer);
        if (!user) return send(response, 401, { message: "Bad credentials" });
        if (route === "GET /user/emails") await passBarrier();
        return send(response, 200, route === "GET /user"
          ? { id: user.id, login: user.login, name: user.name }
          : user.emails.map((email) => ({ ...email, visibility: null })));
      }
      return send(response, 404, { message: "Not Found" });
    })().catch((error: unknown) => send(response, 500, { message: String(error) }));
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Could not start the GitHub stub");
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>((resolve, reject) => {
      server.closeAllConnections();
      server.close((error) => (error ? reject(error) : resolve()));
    }),
  };
}

/** Sets the GitHub user the stub reports for the next authorizations. */
export async function setGitHubStubUser(stubUrl: string, user: StubGitHubUser): Promise<void> {
  const response = await fetch(`${stubUrl}/__stub/user`, { method: "POST", body: JSON.stringify(user) });
  if (response.status !== 204) throw new Error(`GitHub stub refused the user (${response.status})`);
}

/** Makes the stub hold the next `count` `/user/emails` answers until all have arrived. */
export async function setGitHubStubBarrier(stubUrl: string, count: number): Promise<void> {
  const response = await fetch(`${stubUrl}/__stub/barrier`, { method: "POST", body: JSON.stringify({ count }) });
  if (response.status !== 204) throw new Error(`GitHub stub refused the barrier (${response.status})`);
}
