import { fixedClock, NotFoundError, ResponseCookies } from "@devmentor/core";
import { LockMode, UniqueConstraintViolationException, User, UserRole, type EntityManager } from "@devmentor/db";
import { describe, expect, it, vi } from "vitest";

import { createAppConfig } from "@/server/config";
import { GitHubOAuthError, type GitHubIdentity } from "@/server/services/auth/github-oauth.port";
import {
  GitHubSignInError,
  GitHubSignInService,
  initialDisplayName,
  OAUTH_COOKIE,
  OAUTH_COOKIE_MAX_AGE_SECONDS,
  OAUTH_COOKIE_PATH,
  signInErrorPath,
  WELCOME_PATH,
} from "@/server/services/auth/github-sign-in.service";

const NOW = new Date("2026-10-27T12:00:00.000Z");
const EARLIER = new Date("2026-01-01T00:00:00.000Z");
const AUTHORIZE = new URL("https://github.com/login/oauth/authorize?state=x");

const identity: GitHubIdentity = {
  id: "583231",
  login: "octocat",
  name: "The Octocat",
  emails: [
    { email: "secondary@example.com", primary: false, verified: true },
    { email: " Octo@Example.com ", primary: true, verified: true },
  ],
};

type Row = { id: string; email: string; name: string; githubId: string | null; emailConfirmedAt: Date | null };

/** In-memory `users` behind the `em` calls the service makes inside `transactional`. */
function fakeDb(initial: Row[] = []) {
  const users = new Map(initial.map((row) => [row.id, { ...row }]));
  const roles: { userId: string; role: string }[] = [];
  const failures: unknown[] = [];
  const tx = {
    findOne: vi.fn(async (_entity: unknown, where: Partial<Row>) => {
      const row = [...users.values()].find((candidate) =>
        Object.entries(where).every(([key, value]) => candidate[key as keyof Row] === value));
      return row ?? null;
    }),
    create: vi.fn((entity: unknown, data: Record<string, unknown>) => ({ entity, ...data })),
    persist: vi.fn<(items: unknown[]) => void>(),
    flush: vi.fn(async () => {
      if (failures.length > 0) throw failures.shift();
      const pending = tx.persist.mock.calls.flatMap(([items]) => items as unknown[]);
      for (const item of pending) {
        const record = item as { entity: unknown; user?: Row } & Row;
        if (record.entity === User) {
          record.id = `user-${users.size + 1}`;
          users.set(record.id, record);
        } else if (record.entity === UserRole) {
          roles.push({ userId: record.user!.id, role: (record as unknown as { role: string }).role });
        }
      }
      tx.persist.mockClear();
    }),
  };
  const em = {
    transactional: vi.fn(async (callback: (em: unknown) => Promise<unknown>, options: unknown) => {
      expect(options).toEqual({ clear: true });
      // A clear fork: nothing from a rolled-back attempt is still pending.
      tx.persist.mockClear();
      const result = await callback(tx);
      await tx.flush();
      return result;
    }),
  };
  return { em, tx, users, roles, failures };
}

function setup({ rows = [] as Row[], appUrl = "https://devmentor.example" } = {}) {
  const db = fakeDb(rows);
  const githubOAuth = {
    authorizationUrl: vi.fn(() => AUTHORIZE),
    exchangeCode: vi.fn(async () => "gho_token"),
    fetchIdentity: vi.fn(async () => identity),
  };
  const authSessionService = { start: vi.fn(async () => undefined) };
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const service = new GitHubSignInService({
    em: db.em as unknown as EntityManager,
    clock: fixedClock(NOW),
    config: createAppConfig({ APP_URL: appUrl }),
    logger,
    githubOAuth,
    authSessionService: authSessionService as never,
  });
  return { ...db, githubOAuth, authSessionService, logger, service };
}

/** Runs `begin` and returns the cookie value a browser would send back. */
function begin(service: GitHubSignInService, returnTo: unknown = null) {
  const cookies = new ResponseCookies();
  const url = service.begin(returnTo, cookies);
  const header = cookies.toHeaderValues()[0]!;
  const value = decodeURIComponent(header.split(";")[0]!.slice(OAUTH_COOKIE.length + 1));
  const attempt = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as { state: string; verifier: string; returnTo: string | null };
  return { url, header, value, attempt };
}

function callbackRequest(cookieValue?: string) {
  return new Request("https://devmentor.example/api/auth/github/callback", {
    headers: cookieValue === undefined ? {} : { cookie: `${OAUTH_COOKIE}=${cookieValue}` },
  });
}

async function complete(service: GitHubSignInService, query: Record<string, string>, cookieValue?: string) {
  const cookies = new ResponseCookies();
  const result = await service
    .complete(new URLSearchParams(query), callbackRequest(cookieValue), cookies)
    .catch((error: unknown) => error);
  return { result, cookies };
}

function expectCleared(cookies: ResponseCookies, secure = true) {
  const header = cookies.toHeaderValues().find((value) => value.startsWith(`${OAUTH_COOKIE}=`));
  expect(header).toBeDefined();
  expect(header).toContain("Max-Age=0");
  expect(header).toContain(`Path=${OAUTH_COOKIE_PATH}`);
  expect(header!.includes("Secure")).toBe(secure);
}

function expectSignInError(result: unknown, code: string, returnTo: string | null) {
  expect(result).toBeInstanceOf(GitHubSignInError);
  expect((result as GitHubSignInError).code).toBe(code);
  expect((result as GitHubSignInError).returnTo).toBe(returnTo);
}

/** Begins an attempt and completes it with GitHub's success query. */
async function signIn(context: ReturnType<typeof setup>, returnTo: unknown = null) {
  const { value, attempt } = begin(context.service, returnTo);
  return { attempt, ...(await complete(context.service, { code: "the-code", state: attempt.state }, value)) };
}

describe("GitHubSignInService.begin", () => {
  it("stores state, verifier and the validated returnTo in a short-lived, path-scoped cookie", () => {
    const { service, githubOAuth } = setup();
    const { url, header, attempt } = begin(service, "/invitations/abc?x=1");
    expect(url).toBe(AUTHORIZE);
    expect(attempt.state).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(attempt.verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(attempt.state).not.toBe(attempt.verifier);
    expect(attempt.returnTo).toBe("/invitations/abc?x=1");
    expect(githubOAuth.authorizationUrl).toHaveBeenCalledWith(attempt.state, attempt.verifier);
    expect(header).toContain(`Max-Age=${OAUTH_COOKIE_MAX_AGE_SECONDS}`);
    expect(header).toContain(`Path=${OAUTH_COOKIE_PATH}`);
    expect(header).toContain("HttpOnly");
    expect(header).toContain("SameSite=Lax");
    expect(header).toContain("Secure");
  });

  it.each([["//evil.example"], ["/api/users"], ["/"], [null], [undefined]])(
    "drops an unsafe, reserved or empty returnTo (%s)",
    (returnTo) => {
      expect(begin(setup().service, returnTo).attempt.returnTo).toBeNull();
    },
  );

  it("omits Secure when APP_URL is plain http (local development)", () => {
    expect(begin(setup({ appUrl: "http://localhost:3000" }).service).header).not.toContain("Secure");
  });

  it("uses a new state and verifier for every attempt", () => {
    const { service } = setup();
    expect(begin(service).attempt.state).not.toBe(begin(service).attempt.state);
  });
});

describe("GitHubSignInService.complete: callback outcomes", () => {
  it("creates a new account holding mentee, starts a session and lands on the welcome page", async () => {
    const context = setup();
    const { result, cookies, attempt } = await signIn(context);
    expect(result).toEqual({ redirectTo: WELCOME_PATH });
    expect(context.githubOAuth.exchangeCode).toHaveBeenCalledWith("the-code", attempt.verifier);
    expect(context.githubOAuth.fetchIdentity).toHaveBeenCalledWith("gho_token");
    expect([...context.users.values()]).toEqual([expect.objectContaining({
      id: "user-1", email: "octo@example.com", name: "The Octocat", githubId: "583231", emailConfirmedAt: NOW,
    })]);
    expect(context.roles).toEqual([{ userId: "user-1", role: "mentee" }]);
    expect(context.authSessionService.start).toHaveBeenCalledWith("user-1", cookies);
    expectCleared(cookies);
  });

  it("sends a new account to its returnTo with the one-time welcome flag", async () => {
    const { result } = await signIn(setup(), "/invitations/abc?x=1#top");
    expect(result).toEqual({ redirectTo: "/invitations/abc?x=1&welcome=1#top" });
  });

  it("reuses the account with this GitHub id without overwriting its edited name", async () => {
    const context = setup({ rows: [{ id: "u1", email: "old@example.com", name: "Edited", githubId: "583231", emailConfirmedAt: EARLIER }] });
    const { result, cookies } = await signIn(context, "/mentors");
    expect(result).toEqual({ redirectTo: "/mentors" });
    expect(context.users.get("u1")).toEqual({ id: "u1", email: "old@example.com", name: "Edited", githubId: "583231", emailConfirmedAt: EARLIER });
    expect(context.users.size).toBe(1);
    expect(context.tx.create).not.toHaveBeenCalled();
    expect(context.authSessionService.start).toHaveBeenCalledWith("u1", cookies);
  });

  it("returns an existing account without returnTo to the home page", async () => {
    const context = setup({ rows: [{ id: "u1", email: "octo@example.com", name: "Ada", githubId: "583231", emailConfirmedAt: EARLIER }] });
    expect((await signIn(context)).result).toEqual({ redirectTo: "/" });
  });

  it("links an account with the verified primary email under a row lock, keeping an earlier confirmation", async () => {
    const context = setup({ rows: [{ id: "u1", email: "octo@example.com", name: "Ada", githubId: null, emailConfirmedAt: EARLIER }] });
    const { result } = await signIn(context);
    expect(result).toEqual({ redirectTo: "/" });
    expect(context.tx.findOne).toHaveBeenNthCalledWith(1, User, { githubId: "583231" });
    expect(context.tx.findOne).toHaveBeenNthCalledWith(2, User, { email: "octo@example.com" }, { lockMode: LockMode.PESSIMISTIC_WRITE });
    expect(context.users.get("u1")).toMatchObject({ name: "Ada", githubId: "583231", emailConfirmedAt: EARLIER });
    expect(context.authSessionService.start).toHaveBeenCalledWith("u1", expect.any(ResponseCookies));
  });

  it("confirms the email of a linked account that was never confirmed", async () => {
    const context = setup({ rows: [{ id: "u1", email: "octo@example.com", name: "Ada", githubId: null, emailConfirmedAt: null }] });
    await signIn(context);
    expect(context.users.get("u1")).toMatchObject({ githubId: "583231", emailConfirmedAt: NOW });
  });

  it("refuses an email already linked to a different GitHub id (github_email_taken)", async () => {
    const context = setup({ rows: [{ id: "u1", email: "octo@example.com", name: "Ada", githubId: "999", emailConfirmedAt: EARLIER }] });
    const { result, cookies } = await signIn(context, "/mentors");
    expectSignInError(result, "github_email_taken", "/mentors");
    expect((result as GitHubSignInError).status).toBe(409);
    expect(context.users.get("u1")!.githubId).toBe("999");
    expect(context.authSessionService.start).not.toHaveBeenCalled();
    expectCleared(cookies);
  });

  it("refuses a GitHub account without a verified primary email and creates nothing", async () => {
    const context = setup();
    context.githubOAuth.fetchIdentity.mockResolvedValueOnce({
      ...identity,
      emails: [{ email: "a@example.com", primary: true, verified: false }, { email: "b@example.com", primary: false, verified: true }],
    });
    const { result, cookies } = await signIn(context, "/mentors");
    expectSignInError(result, "github_no_verified_email", "/mentors");
    expect(context.em.transactional).not.toHaveBeenCalled();
    expectCleared(cookies);
  });

  it("maps a denial to github_cancelled and keeps the safe returnTo", async () => {
    const context = setup();
    const { value, attempt } = begin(context.service, "/invitations/abc");
    const { result, cookies } = await complete(context.service, { error: "access_denied", state: attempt.state }, value);
    expectSignInError(result, "github_cancelled", "/invitations/abc");
    expect((result as GitHubSignInError).status).toBe(400);
    expect(context.githubOAuth.exchangeCode).not.toHaveBeenCalled();
    expectCleared(cookies);
  });

  it.each([
    ["another provider error", (state: string) => ({ error: "server_error", state })],
    ["a missing code", (state: string) => ({ state })],
  ])("maps %s to github_failed", async (_label, query) => {
    const context = setup();
    const { value, attempt } = begin(context.service, "/mentors");
    const { result, cookies } = await complete(context.service, query(attempt.state), value);
    expectSignInError(result, "github_failed", "/mentors");
    expect(context.githubOAuth.exchangeCode).not.toHaveBeenCalled();
    expectCleared(cookies);
  });

  it.each([
    ["a mismatched state", (state: string) => ({ code: "c", state: `${state.slice(1)}x` })],
    ["a state of a different length", () => ({ code: "c", state: "short" })],
    ["a missing state", () => ({ code: "c" })],
    ["a denial with a mismatched state", () => ({ error: "access_denied", state: "forged" })],
  ])("rejects %s before handling success or denial (github_failed)", async (_label, query) => {
    const context = setup();
    const { value, attempt } = begin(context.service, "/mentors");
    const { result, cookies } = await complete(context.service, query(attempt.state), value);
    expectSignInError(result, "github_failed", "/mentors");
    expect(context.githubOAuth.exchangeCode).not.toHaveBeenCalled();
    expect(context.em.transactional).not.toHaveBeenCalled();
    expectCleared(cookies);
  });

  it.each([
    ["missing (expired)", undefined],
    ["not base64 JSON", "%%%"],
    ["JSON of the wrong shape", Buffer.from(JSON.stringify({ state: "s" })).toString("base64url")],
  ])("fails without a returnTo when the OAuth cookie is %s", async (_label, cookie) => {
    const context = setup();
    const { result, cookies } = await complete(context.service, { code: "c", state: "s" }, cookie);
    expectSignInError(result, "github_failed", null);
    expectCleared(cookies);
  });

  it("re-validates a returnTo read back from the cookie", async () => {
    const context = setup();
    const forged = Buffer.from(JSON.stringify({ state: "s", verifier: "v", returnTo: "//evil.example" })).toString("base64url");
    const { result } = await complete(context.service, { error: "access_denied", state: "s" }, forged);
    expectSignInError(result, "github_cancelled", null);
  });

  it.each([["the token exchange", "exchangeCode"], ["the identity lookup", "fetchIdentity"]] as const)(
    "maps a provider failure in %s to github_failed, logs a safe summary and creates nothing",
    async (_label, method) => {
      const context = setup();
      const providerError = new GitHubOAuthError("GitHub token exchange failed", { cause: new TypeError("https://secret.example") });
      context.githubOAuth[method].mockRejectedValueOnce(providerError);
      const { result, cookies } = await signIn(context, "/mentors");
      expectSignInError(result, "github_failed", "/mentors");
      expect((result as Error).cause).toBe(providerError);
      expect(context.logger.warn).toHaveBeenCalledWith("GitHub sign-in failed at the provider", { cause: { name: "TypeError" } });
      expect(JSON.stringify(context.logger.warn.mock.calls)).not.toContain("secret");
      expect(context.em.transactional).not.toHaveBeenCalled();
      expectCleared(cookies);
    },
  );

  it("lets an unexpected provider bug through (internal error, cookie still cleared)", async () => {
    const context = setup();
    const bug = new RangeError("bug");
    context.githubOAuth.exchangeCode.mockRejectedValueOnce(bug);
    const { result, cookies } = await signIn(context);
    expect(result).toBe(bug);
    expectCleared(cookies);
  });

  it("clears a plain-http OAuth cookie without Secure", async () => {
    const context = setup({ appUrl: "http://localhost:3000" });
    const { cookies } = await signIn(context);
    expectCleared(cookies, false);
  });
});

describe("GitHubSignInService.complete: concurrency", () => {
  it("retries once in a fresh transaction after losing a concurrent insert and reuses the winner", async () => {
    const context = setup();
    const winner = { id: "winner", email: "octo@example.com", name: "The Octocat", githubId: "583231", emailConfirmedAt: NOW };
    // The other callback commits between our lookups and our insert.
    context.failures.push(new UniqueConstraintViolationException(new Error("users_github_id_unique")));
    context.tx.flush.mockImplementationOnce(async () => {
      context.users.set(winner.id, winner);
      throw context.failures.shift();
    });
    const { result, cookies } = await signIn(context);
    expect(result).toEqual({ redirectTo: "/" });
    expect(context.em.transactional).toHaveBeenCalledTimes(2);
    expect(context.users.size).toBe(1);
    expect(context.authSessionService.start).toHaveBeenCalledWith("winner", cookies);
  });

  it("gives up after a second unique violation", async () => {
    const context = setup();
    const second = new UniqueConstraintViolationException(new Error("again"));
    context.failures.push(new UniqueConstraintViolationException(new Error("first")), second);
    const { result } = await signIn(context);
    expect(result).toBe(second);
    expect(context.em.transactional).toHaveBeenCalledTimes(2);
    expect(context.authSessionService.start).not.toHaveBeenCalled();
  });

  it("does not retry other database failures", async () => {
    const context = setup();
    const failure = new Error("disconnected");
    context.failures.push(failure);
    expect((await signIn(context)).result).toBe(failure);
    expect(context.em.transactional).toHaveBeenCalledOnce();
  });

  it("reuses an account a concurrent callback linked while this one waited for the row lock", async () => {
    const context = setup({ rows: [{ id: "u1", email: "octo@example.com", name: "Ada", githubId: null, emailConfirmedAt: null }] });
    // First lookup (by GitHub id) misses; by the time the lock is granted the
    // other callback has linked the same identity.
    context.tx.findOne.mockImplementationOnce(async () => {
      context.users.get("u1")!.githubId = "583231";
      context.users.get("u1")!.emailConfirmedAt = EARLIER;
      return null;
    });
    const { result } = await signIn(context);
    expect(result).toEqual({ redirectTo: "/" });
    expect(context.users.get("u1")).toMatchObject({ githubId: "583231", emailConfirmedAt: EARLIER });
  });
});

describe("GitHub sign-in helpers", () => {
  it.each([
    [{ login: "octocat", name: "  Ada Lovelace  " }, "Ada Lovelace"],
    [{ login: "octocat", name: "   " }, "octocat"],
    [{ login: "octocat", name: null }, "octocat"],
    [{ login: "octocat", name: "é".repeat(150) }, "é".repeat(100)],
    [{ login: "octocat", name: "😀".repeat(101) }, "😀".repeat(100)],
  ])("derives the initial display name from %j", (input, expected) => {
    expect(initialDisplayName(input)).toBe(expected);
  });

  it("builds sign-in error paths that keep the validated returnTo", () => {
    expect(signInErrorPath(new GitHubSignInError("github_cancelled", "/invitations/a b?x=1")))
      .toBe("/sign-in?error=github_cancelled&returnTo=%2Finvitations%2Fa+b%3Fx%3D1");
    expect(signInErrorPath(new GitHubSignInError("github_failed", null))).toBe("/sign-in?error=github_failed");
    expect(signInErrorPath(new NotFoundError())).toBe("/sign-in?error=github_failed");
  });
});
