import { fixedClock, hashToken, isAppError, ResponseCookies } from "@devmentor/core";
import {
  consumeSingleUseToken, EmailConfirmationToken, inspectSingleUseToken, LockMode, UniqueConstraintViolationException,
  User, UserRole, type EntityManager,
} from "@devmentor/db";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAppConfig } from "@/server/config";
import {
  CONFIRMATION_LINK_LIFETIME_HOURS, CONFIRMATION_LINK_MESSAGES, PASSWORD_RATE_LIMITS, PasswordAccountService,
  rateLimitKey,
} from "@/server/services/auth/password-account.service";
import { MemoryEmailSender } from "@/server/services/notifications/adapters/memory-email-sender";
import { EmailSendError } from "@/server/services/notifications/email-sender.port";

vi.mock("@devmentor/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@devmentor/db")>()),
  inspectSingleUseToken: vi.fn(),
  consumeSingleUseToken: vi.fn(),
}));

const NOW = new Date("2026-10-28T12:00:00.000Z");
const HOUR = 60 * 60 * 1000;
const EMAIL = "ada@example.com";
const PASSWORD = "a short phrase of mine";
const IP = "203.0.113.7";

type UserRow = {
  id: string; email: string; name: string; passwordHash: string | null; emailConfirmedAt: Date | null; githubId?: string | null;
};
type TokenRow = { id: string; user: UserRow; email: string; tokenHash: string; expiresAt: Date; consumedAt: Date | null };
type Pending = { entity: unknown; data: Record<string, unknown> & { user?: UserRow } };

/** The hash the fake hasher produces, so a compare succeeds only for the same password. */
const hashOf = (password: string) => `hash:${password}`;

function unconfirmed(overrides: Partial<UserRow> = {}): UserRow {
  return { id: "u1", email: EMAIL, name: "Ada", passwordHash: hashOf(PASSWORD), emailConfirmedAt: null, ...overrides };
}

function confirmed(overrides: Partial<UserRow> = {}): UserRow {
  return unconfirmed({ emailConfirmedAt: new Date("2026-01-01T00:00:00Z"), ...overrides });
}

/**
 * In-memory `users`, `user_roles` and `email_confirmation_tokens` behind the
 * `em` calls the service makes, plus one ordered `events` log shared by every
 * collaborator, so tests can assert what happens before, inside and after a
 * transaction. A transaction that throws restores the rows (rollback).
 */
function setup({ users = [] as UserRow[], tokens = [] as Array<Partial<Omit<TokenRow, "user">> & { raw: string; userId?: string }>, refused = [] as string[] } = {}) {
  const events: string[] = [];
  const userRows = new Map(users.map((row) => [row.id, { ...row }]));
  const tokenRows: TokenRow[] = [];
  const roles: { userId: string; role: string }[] = [];
  const failures: unknown[] = [];
  const hooks: { beforeLock?: () => void } = {};

  const findUser = (where: Partial<UserRow>) =>
    [...userRows.values()].find((row) => Object.entries(where).every(([key, value]) => row[key as keyof UserRow] === value)) ?? null;

  const addToken = (raw: string, user: UserRow, fields: Partial<TokenRow> = {}) => {
    const row: TokenRow = {
      id: `t${tokenRows.length + 1}`, user, email: user.email, tokenHash: hashToken(raw),
      expiresAt: new Date(NOW.getTime() + HOUR), consumedAt: null, ...fields,
    };
    tokenRows.push(row);
    return row;
  };

  let pending: Pending[] = [];
  const created: string[] = [];
  const tx = {
    findOne: vi.fn(async (_entity: unknown, where: Partial<UserRow>, options?: { lockMode?: LockMode }) => {
      if (options?.lockMode !== undefined) {
        hooks.beforeLock?.();
        events.push("lock");
      }
      return findUser(where);
    }),
    create: vi.fn((entity: unknown, data: Record<string, unknown>) => {
      const item = entity === User ? { id: "", githubId: null, ...data } : { ...data };
      pending.push({ entity, data: item });
      return item;
    }),
    persist: vi.fn(),
    nativeDelete: vi.fn(async (_entity: unknown, where: { user: string }) => {
      events.push("delete tokens");
      const before = tokenRows.length;
      tokenRows.splice(0, tokenRows.length, ...tokenRows.filter((row) => row.user.id !== where.user));
      return before - tokenRows.length;
    }),
    flush: vi.fn(async () => {
      if (failures.length > 0) throw failures.shift();
      for (const { entity, data } of pending) {
        if (entity === User) {
          const row = data as unknown as UserRow;
          row.id = `user-${userRows.size + 1}`;
          userRows.set(row.id, row);
          created.push(row.id);
        } else if (entity === UserRole) {
          roles.push({ userId: data.user!.id, role: data.role as string });
        } else if (entity === EmailConfirmationToken) {
          tokenRows.push({ id: `t${tokenRows.length + 1}`, consumedAt: null, ...(data as Omit<TokenRow, "id" | "consumedAt">) });
        }
      }
      pending = [];
    }),
  };

  const em = {
    // Outside a transaction the service gets its own copy, like a separate fork.
    findOne: vi.fn(async (_entity: unknown, where: Partial<UserRow>) => {
      const row = findUser(where);
      return row ? { ...row } : null;
    }),
    transactional: vi.fn(async (callback: (em: unknown) => Promise<unknown>, options: unknown) => {
      expect(options).toEqual({ clear: true });
      events.push("begin");
      const savedUsers = [...userRows.values()].map((row) => [row, { ...row }] as const);
      const savedTokens = tokenRows.map((row) => [row, { ...row }] as const);
      const savedRoles = [...roles];
      pending = [];
      created.splice(0);
      try {
        const result = await callback(tx);
        await tx.flush();
        events.push("commit");
        return result;
      } catch (error) {
        // Rows inserted by this transaction go; rows committed by others stay.
        for (const id of created.splice(0)) userRows.delete(id);
        for (const [row, copy] of savedUsers) if (userRows.has(copy.id)) Object.assign(row, copy);
        tokenRows.splice(0, tokenRows.length, ...savedTokens.map(([row, copy]) => Object.assign(row, copy)));
        roles.splice(0, roles.length, ...savedRoles);
        pending = [];
        events.push("rollback");
        throw error;
      }
    }),
  };

  const tokenStatus = (row: TokenRow, now: Date) =>
    row.consumedAt ? "used" : row.expiresAt.getTime() <= now.getTime() ? "expired" : "valid";
  vi.mocked(inspectSingleUseToken).mockImplementation(async (_em, _entity, raw, now) => {
    const row = tokenRows.find((candidate) => candidate.tokenHash === hashToken(raw));
    return row ? { status: tokenStatus(row, now), record: row } as never : { status: "invalid" };
  });
  vi.mocked(consumeSingleUseToken).mockImplementation(async (usedEm, _entity, raw, now) => {
    expect(usedEm).toBe(tx);
    events.push("consume");
    const row = tokenRows.find((candidate) => candidate.tokenHash === hashToken(raw));
    if (!row) return { status: "invalid" };
    const status = tokenStatus(row, now);
    if (status !== "valid") return { status, record: row } as never;
    row.consumedAt = now;
    return { status: "consumed", record: row } as never;
  });

  const refusedKeys = new Set(refused);
  const rateLimiter = {
    hit: vi.fn(async (key: string, ...rule: [{ limit: number; windowMs: number }]) => {
      expect(rule).toHaveLength(1);
      events.push(`limit ${key}`);
      return refusedKeys.has(key) ? { allowed: false, retryAfterMs: 90_000 } : { allowed: true, retryAfterMs: 0 };
    }),
  };
  const passwordHasher = {
    hash: vi.fn(async (password: string) => { events.push("hash"); return hashOf(password); }),
    compare: vi.fn(async (password: string, hash: string) => { events.push("compare"); return hash === hashOf(password); }),
    dummyCompare: vi.fn(async (password: string) => { events.push("dummy compare"); expect(typeof password).toBe("string"); }),
  };
  const emailSender = new MemoryEmailSender();
  const send = vi.spyOn(emailSender, "send").mockImplementation(async (message) => {
    events.push("send");
    if (emailSender.failWith) throw emailSender.failWith;
    emailSender.sent.push(message);
  });
  const authSessionService = {
    start: vi.fn(async (userId: string, cookies: ResponseCookies) => {
      events.push("session start");
      cookies.set("devmentor_session", `session-of-${userId}`, { secure: false });
    }),
    create: vi.fn(async (_userId: string, usedEm: unknown) => {
      expect(usedEm).toBe(tx);
      events.push("session create");
      return "session-token";
    }),
    setCookie: vi.fn((cookies: ResponseCookies, token: string) => {
      events.push("cookie");
      cookies.set("devmentor_session", token, { secure: false });
    }),
  };
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

  const service = new PasswordAccountService({
    em: em as unknown as EntityManager,
    clock: fixedClock(NOW),
    config: createAppConfig({ APP_URL: "https://devmentor.test" }),
    logger,
    passwordHasher,
    emailSender,
    rateLimiter,
    authSessionService: authSessionService as never,
  });

  for (const { userId, raw, ...fields } of tokens) {
    addToken(raw, userRows.get(userId ?? "u1")!, fields);
  }

  return {
    service, events, em, tx, users: userRows, tokens: tokenRows, roles, failures, hooks, addToken,
    rateLimiter, passwordHasher, emailSender, send, authSessionService, logger,
  };
}

type Context = ReturnType<typeof setup>;

/** The raw token inside the latest confirmation link, and the link itself. */
function lastLink(context: Context) {
  const message = context.emailSender.sent.at(-1)!;
  const url = new URL(/https:\/\/devmentor\.test\/confirm-email\?\S+/.exec(message.text)![0]);
  return { url, token: url.searchParams.get("token")! };
}

async function failure(promise: Promise<unknown>) {
  const error = await promise.then(() => undefined, (caught: unknown) => caught);
  expect(isAppError(error)).toBe(true);
  return error as { code: string; status: number; message: string; retryAfterMs?: number };
}

const signUp = (overrides: Record<string, unknown> = {}) =>
  ({ displayName: "Ada", email: EMAIL, password: PASSWORD, returnTo: undefined, ...overrides }) as never;
const credentials = (overrides: Record<string, unknown> = {}) =>
  ({ email: EMAIL, password: PASSWORD, returnTo: undefined, ...overrides }) as never;
const confirmInput = (token: string, overrides: Record<string, unknown> = {}) =>
  ({ token, password: PASSWORD, returnTo: undefined, ...overrides }) as never;

const RAW = "R".repeat(43);
const OLD = "O".repeat(43);

const keys = {
  signInIp: `sign-in:ip:${IP}`,
  signInEmail: `sign-in:email:${EMAIL}`,
  signUpIp: `sign-up:ip:${IP}`,
  confirmationEmail: `confirmation-email:email:${EMAIL}`,
};

beforeEach(() => {
  vi.mocked(inspectSingleUseToken).mockReset();
  vi.mocked(consumeSingleUseToken).mockReset();
});

describe("password rate-limit rules", () => {
  it("matches the four rules of the API contract", () => {
    expect(PASSWORD_RATE_LIMITS).toEqual({
      signInPerIp: { id: "sign-in", subject: "ip", limit: 10, windowMs: 15 * 60 * 1000 },
      signInPerEmail: { id: "sign-in", subject: "email", limit: 5, windowMs: 15 * 60 * 1000 },
      signUpPerIp: { id: "sign-up", subject: "ip", limit: 5, windowMs: HOUR },
      confirmationEmailPerAddress: { id: "confirmation-email", subject: "email", limit: 3, windowMs: HOUR },
    });
    expect(rateLimitKey(PASSWORD_RATE_LIMITS.signInPerEmail, EMAIL)).toBe(keys.signInEmail);
  });
});

describe("PasswordAccountService.register", () => {
  it("creates an unconfirmed mentee with a 24-hour link and sends it after commit", async () => {
    const context = setup();
    const result = await context.service.register(signUp({ returnTo: "/invite/secret" }), IP);
    expect(result).toEqual({ email: EMAIL, emailSent: true });
    expect([...context.users.values()]).toEqual([
      { id: "user-1", email: EMAIL, name: "Ada", passwordHash: hashOf(PASSWORD), emailConfirmedAt: null, githubId: null },
    ]);
    expect(context.roles).toEqual([{ userId: "user-1", role: "mentee" }]);
    const { url, token } = lastLink(context);
    expect(url.searchParams.get("returnTo")).toBe("/invite/secret");
    expect(context.tokens).toEqual([expect.objectContaining({
      email: EMAIL, tokenHash: hashToken(token), expiresAt: new Date(NOW.getTime() + 24 * HOUR), consumedAt: null,
    })]);
    expect(CONFIRMATION_LINK_LIFETIME_HOURS).toBe(24);
    // The path is never stored: only the hash, the address and the expiry.
    expect(JSON.stringify(context.tokens, (key, value) => (key === "user" ? undefined : value))).not.toMatch(/invite|returnTo/);
    expect(context.emailSender.sent[0]).toMatchObject({ to: EMAIL, subject: "Confirm your email address for DevMentor" });
    expect(context.events).toEqual([
      `limit ${keys.signUpIp}`, `limit ${keys.confirmationEmail}`, "hash", "begin", "lock", "commit", "send",
    ]);
    expect(context.tx.findOne).toHaveBeenCalledWith(User, { email: EMAIL }, { lockMode: LockMode.PESSIMISTIC_WRITE });
    expect(context.rateLimiter.hit).toHaveBeenCalledWith(keys.confirmationEmail, { limit: 3, windowMs: HOUR });
    expect(context.rateLimiter.hit).toHaveBeenCalledWith(keys.signUpIp, { limit: 5, windowMs: HOUR });
  });

  it("omits returnTo from the link when none was given", async () => {
    const context = setup();
    await context.service.register(signUp(), IP);
    expect(lastLink(context).url.searchParams.has("returnTo")).toBe(false);
  });

  it("answers identically for new, unconfirmed and confirmed emails, hashing on the confirmed path too", async () => {
    const results = [];
    for (const users of [[], [unconfirmed()], [confirmed()]]) {
      const context = setup({ users });
      results.push(await context.service.register(signUp(), null));
      expect(context.passwordHasher.hash).toHaveBeenCalledExactlyOnceWith(PASSWORD);
      expect(context.send).toHaveBeenCalledOnce();
    }
    expect(results).toEqual([{ email: EMAIL, emailSent: true }, { email: EMAIL, emailSent: true }, { email: EMAIL, emailSent: true }]);
  });

  it("leaves a confirmed account untouched and sends the 'already have an account' email with its stored name", async () => {
    const context = setup({ users: [confirmed({ name: "Ada Owner", passwordHash: hashOf("the owner's own phrase") })] });
    await context.service.register(signUp({ displayName: "Attacker", password: "attacker's long phrase" }), null);
    expect(context.users.get("u1")).toEqual(confirmed({ name: "Ada Owner", passwordHash: hashOf("the owner's own phrase") }));
    expect(context.tokens).toEqual([]);
    expect(context.tx.nativeDelete).not.toHaveBeenCalled();
    const message = context.emailSender.sent[0]!;
    expect(message).toMatchObject({ to: EMAIL, subject: "You already have a DevMentor account" });
    expect(message.text).toContain("Hi Ada Owner,");
    expect(message.text).not.toContain("confirm-email");
  });

  it("lets the last registration of an unconfirmed account win: new name and password, older links deleted", async () => {
    const context = setup({ users: [unconfirmed({ name: "Attacker", passwordHash: hashOf("attacker's long phrase") })], tokens: [{ raw: OLD }] });
    await context.service.register(signUp({ displayName: "Ada" }), null);
    expect(context.users.get("u1")).toMatchObject({ name: "Ada", passwordHash: hashOf(PASSWORD), emailConfirmedAt: null });
    const { token } = lastLink(context);
    expect(context.tokens.map((row) => row.tokenHash)).toEqual([hashToken(token)]);
    expect(context.tx.nativeDelete).toHaveBeenCalledWith(EmailConfirmationToken, { user: "u1" });
    // The user row is locked before its token rows are touched.
    expect(context.events).toEqual([`limit ${keys.confirmationEmail}`, "hash", "begin", "lock", "delete tokens", "commit", "send"]);
  });

  it("never replaces credentials that were confirmed after the registration first saw the account", async () => {
    const context = setup({ users: [unconfirmed({ passwordHash: hashOf("the owner's own phrase") })] });
    // Confirmation commits while this registration hashes and waits for the lock.
    context.hooks.beforeLock = () => { context.users.get("u1")!.emailConfirmedAt = NOW; };
    await context.service.register(signUp({ displayName: "Attacker", password: "attacker's long phrase" }), null);
    expect(context.users.get("u1")).toMatchObject({ name: "Ada", passwordHash: hashOf("the owner's own phrase"), emailConfirmedAt: NOW });
    expect(context.tx.nativeDelete).not.toHaveBeenCalled();
    expect(context.emailSender.sent[0]!.subject).toBe("You already have a DevMentor account");
  });

  it("retries in a fresh transaction after losing the unique-email race, then treats the winner as unconfirmed", async () => {
    const context = setup();
    context.tx.flush.mockImplementationOnce(async () => {
      // A concurrent registration commits the same address first.
      context.users.set("winner", unconfirmed({ id: "winner", name: "Other", passwordHash: hashOf("other long phrase") }));
      throw new UniqueConstraintViolationException(new Error("users_email_unique"));
    });
    const result = await context.service.register(signUp(), null);
    expect(result).toEqual({ email: EMAIL, emailSent: true });
    expect(context.em.transactional).toHaveBeenCalledTimes(2);
    expect(context.users.size).toBe(1);
    expect(context.users.get("winner")).toMatchObject({ name: "Ada", passwordHash: hashOf(PASSWORD) });
    expect(context.events.filter((event) => event === "lock")).toHaveLength(2);
  });

  it("gives up after a second unique violation and does not retry other failures", async () => {
    const context = setup();
    const second = new UniqueConstraintViolationException(new Error("again"));
    context.failures.push(new UniqueConstraintViolationException(new Error("first")), second);
    await expect(context.service.register(signUp(), null)).rejects.toBe(second);
    expect(context.em.transactional).toHaveBeenCalledTimes(2);

    const other = setup();
    const broken = new Error("disconnected");
    other.failures.push(broken);
    await expect(other.service.register(signUp(), null)).rejects.toBe(broken);
    expect(other.em.transactional).toHaveBeenCalledOnce();
    expect(other.send).not.toHaveBeenCalled();
  });

  it("keeps the account and answers emailSent: false when sending fails, logging no secrets", async () => {
    const context = setup();
    context.emailSender.failWith = new EmailSendError("SMTP failed", { cause: new Error(`550 ${EMAIL} ${PASSWORD}`) });
    expect(await context.service.register(signUp(), null)).toEqual({ email: EMAIL, emailSent: false });
    expect(context.users.size).toBe(1);
    expect(context.tokens).toHaveLength(1);
    expect(context.logger.warn).toHaveBeenCalledWith("Confirmation-type email was not sent", { kind: "confirmation", cause: { name: "Error" } });
    const logged = JSON.stringify(context.logger.warn.mock.calls);
    expect(logged).not.toContain(EMAIL);
    expect(logged).not.toContain(PASSWORD);
    expect(logged).not.toContain(context.tokens[0]!.tokenHash);
  });

  it("lets an unexpected send error through", async () => {
    const context = setup();
    const bug = new TypeError("bug");
    context.emailSender.failWith = bug;
    await expect(context.service.register(signUp(), null)).rejects.toBe(bug);
  });

  it("refuses with 429 past rule 3 (per IP) before anything else", async () => {
    const context = setup({ refused: [keys.signUpIp] });
    const error = await failure(context.service.register(signUp(), IP));
    expect(error).toMatchObject({ code: "rate_limited", status: 429, retryAfterMs: 90_000 });
    expect(context.events).toEqual([`limit ${keys.signUpIp}`]);
  });

  it("skips rule 3 when the client IP is unknown, but still applies rule 4", async () => {
    const context = setup();
    await context.service.register(signUp(), null);
    expect(context.rateLimiter.hit.mock.calls.map(([key]) => key)).toEqual([keys.confirmationEmail]);
  });

  it.each([
    ["a new email", [] as UserRow[], []],
    ["an unconfirmed account with a pending link", [unconfirmed({ name: "Pending", passwordHash: hashOf("pending long phrase") })], [{ raw: OLD }]],
    ["a confirmed account", [confirmed()], []],
  ])("past rule 4 answers emailSent: false for %s and creates, changes and sends nothing", async (_label, users, tokens) => {
    const context = setup({ users, tokens, refused: [keys.confirmationEmail] });
    const usersBefore = structuredClone([...context.users.values()]);
    const tokensBefore = context.tokens.map((row) => ({ ...row }));
    expect(await context.service.register(signUp(), IP)).toEqual({ email: EMAIL, emailSent: false });
    expect(context.events).toEqual([`limit ${keys.signUpIp}`, `limit ${keys.confirmationEmail}`]);
    expect([...context.users.values()]).toEqual(usersBefore);
    expect(context.tokens).toEqual(tokensBefore);
    expect(context.passwordHasher.hash).not.toHaveBeenCalled();
    expect(context.em.transactional).not.toHaveBeenCalled();
    expect(context.send).not.toHaveBeenCalled();
  });

  it("keeps a pending link usable after a sign-up past rule 4", async () => {
    const context = setup({ users: [unconfirmed()], tokens: [{ raw: OLD }], refused: [keys.confirmationEmail] });
    await context.service.register(signUp({ password: "a different long phrase" }), null);
    await expect(context.service.inspectConfirmation(OLD)).resolves.toEqual({ status: "valid", email: EMAIL });
  });
});

describe("PasswordAccountService.signIn", () => {
  it("starts a session for a confirmed account with the right password and returns returnTo or /", async () => {
    const context = setup({ users: [confirmed()] });
    const cookies = new ResponseCookies();
    expect(await context.service.signIn(credentials({ returnTo: "/mentors" }), IP, cookies)).toEqual({ redirectTo: "/mentors" });
    expect(context.authSessionService.start).toHaveBeenCalledWith("u1", cookies);
    expect(context.events).toEqual([`limit ${keys.signInIp}`, `limit ${keys.signInEmail}`, "compare", "session start"]);
    expect(context.rateLimiter.hit).toHaveBeenCalledWith(keys.signInIp, { limit: 10, windowMs: 15 * 60 * 1000 });
    expect(context.rateLimiter.hit).toHaveBeenCalledWith(keys.signInEmail, { limit: 5, windowMs: 15 * 60 * 1000 });
    expect(await context.service.signIn(credentials(), null, new ResponseCookies())).toEqual({ redirectTo: "/" });
  });

  it("answers invalid_credentials for a wrong password, after counting the attempt", async () => {
    const context = setup({ users: [confirmed()] });
    const error = await failure(context.service.signIn(credentials({ password: "wrong" }), IP, new ResponseCookies()));
    expect(error).toMatchObject({ code: "invalid_credentials", status: 401, message: "Email or password is incorrect" });
    expect(context.events).toEqual([`limit ${keys.signInIp}`, `limit ${keys.signInEmail}`, "compare"]);
    expect(context.authSessionService.start).not.toHaveBeenCalled();
  });

  it.each([
    ["a missing account", [] as UserRow[]],
    ["a GitHub-only account", [confirmed({ passwordHash: null, githubId: "583231" })]],
  ])("runs a dummy compare and answers the same 401 for %s", async (_label, users) => {
    const context = setup({ users });
    const error = await failure(context.service.signIn(credentials(), null, new ResponseCookies()));
    expect(error).toMatchObject({ code: "invalid_credentials", status: 401, message: "Email or password is incorrect" });
    expect(context.passwordHasher.dummyCompare).toHaveBeenCalledWith(PASSWORD);
    expect(context.passwordHasher.compare).not.toHaveBeenCalled();
  });

  it("answers email_not_confirmed only with the correct password", async () => {
    const context = setup({ users: [unconfirmed()] });
    expect(await failure(context.service.signIn(credentials(), null, new ResponseCookies())))
      .toMatchObject({ code: "email_not_confirmed", status: 403, message: "Confirm your email first" });
    expect(await failure(context.service.signIn(credentials({ password: "wrong" }), null, new ResponseCookies())))
      .toMatchObject({ code: "invalid_credentials", status: 401 });
    expect(context.authSessionService.start).not.toHaveBeenCalled();
  });

  it("refuses past rule 1 (per IP) before rule 2 and before comparing", async () => {
    const context = setup({ users: [confirmed()], refused: [keys.signInIp] });
    expect(await failure(context.service.signIn(credentials(), IP, new ResponseCookies())))
      .toMatchObject({ code: "rate_limited", status: 429, retryAfterMs: 90_000 });
    expect(context.events).toEqual([`limit ${keys.signInIp}`]);
  });

  it("refuses past rule 2 (per email) before comparing, even with an unknown IP", async () => {
    const context = setup({ users: [confirmed()], refused: [keys.signInEmail] });
    expect(await failure(context.service.signIn(credentials(), null, new ResponseCookies())))
      .toMatchObject({ code: "rate_limited", status: 429 });
    expect(context.events).toEqual([`limit ${keys.signInEmail}`]);
  });
});

describe("PasswordAccountService.resendConfirmation", () => {
  it("replaces the links of an unconfirmed account under the user lock and sends a new one", async () => {
    const context = setup({ users: [unconfirmed()], tokens: [{ raw: OLD }] });
    expect(await context.service.resendConfirmation(credentials({ returnTo: "/invite/x" })))
      .toEqual({ emailSent: true, alreadyConfirmed: false });
    const { url, token } = lastLink(context);
    expect(url.searchParams.get("returnTo")).toBe("/invite/x");
    expect(context.tokens.map((row) => row.tokenHash)).toEqual([hashToken(token)]);
    expect(context.tx.findOne).toHaveBeenCalledWith(User, { id: "u1" }, { lockMode: LockMode.PESSIMISTIC_WRITE });
    expect(context.events).toEqual([`limit ${keys.confirmationEmail}`, "compare", "begin", "lock", "delete tokens", "commit", "send"]);
    await expect(context.service.inspectConfirmation(OLD)).resolves.toEqual({ status: "invalid" });
  });

  it("shares rule 4 with sign-up", async () => {
    const context = setup();
    await context.service.register(signUp(), null);
    await context.service.resendConfirmation(credentials());
    expect(context.rateLimiter.hit.mock.calls.map(([key]) => key)).toEqual([keys.confirmationEmail, keys.confirmationEmail]);
  });

  it("answers alreadyConfirmed for a confirmed account and sends nothing", async () => {
    const context = setup({ users: [confirmed()] });
    expect(await context.service.resendConfirmation(credentials())).toEqual({ emailSent: false, alreadyConfirmed: true });
    expect(context.em.transactional).not.toHaveBeenCalled();
    expect(context.send).not.toHaveBeenCalled();
  });

  it("answers alreadyConfirmed when the account was confirmed while waiting for the lock", async () => {
    const context = setup({ users: [unconfirmed()], tokens: [{ raw: OLD }] });
    context.hooks.beforeLock = () => { context.users.get("u1")!.emailConfirmedAt = NOW; };
    expect(await context.service.resendConfirmation(credentials())).toEqual({ emailSent: false, alreadyConfirmed: true });
    expect(context.tx.nativeDelete).not.toHaveBeenCalled();
    expect(context.send).not.toHaveBeenCalled();
  });

  it.each([
    ["the password was replaced by a newer registration", (row: UserRow) => { row.passwordHash = hashOf("newer long phrase"); }],
    ["the account disappeared", (_row: UserRow, users: Map<string, UserRow>) => { users.delete("u1"); }],
  ])("answers invalid_credentials when %s, deleting nothing", async (_label, change) => {
    const context = setup({ users: [unconfirmed()], tokens: [{ raw: OLD }] });
    context.hooks.beforeLock = () => change(context.users.get("u1")!, context.users);
    expect(await failure(context.service.resendConfirmation(credentials()))).toMatchObject({ code: "invalid_credentials", status: 401 });
    expect(context.tx.nativeDelete).not.toHaveBeenCalled();
    expect(context.send).not.toHaveBeenCalled();
  });

  it("answers invalid_credentials for a wrong password and runs a dummy compare for a missing account", async () => {
    const context = setup({ users: [unconfirmed()] });
    expect(await failure(context.service.resendConfirmation(credentials({ password: "wrong" })))).toMatchObject({ code: "invalid_credentials" });
    expect(await failure(context.service.resendConfirmation(credentials({ email: "nobody@example.com" })))).toMatchObject({ code: "invalid_credentials" });
    expect(context.passwordHasher.dummyCompare).toHaveBeenCalledOnce();
    expect(context.rateLimiter.hit).toHaveBeenCalledTimes(2);
    expect(context.send).not.toHaveBeenCalled();
  });

  it("answers 429 past rule 4 before checking the password", async () => {
    const context = setup({ users: [unconfirmed()], refused: [keys.confirmationEmail] });
    expect(await failure(context.service.resendConfirmation(credentials()))).toMatchObject({ code: "rate_limited", status: 429 });
    expect(context.events).toEqual([`limit ${keys.confirmationEmail}`]);
  });

  it("answers emailSent: false when sending fails", async () => {
    const context = setup({ users: [unconfirmed()] });
    context.emailSender.failWith = new EmailSendError("SMTP failed");
    expect(await context.service.resendConfirmation(credentials())).toEqual({ emailSent: false, alreadyConfirmed: false });
    expect(context.tokens).toHaveLength(1);
  });
});

describe("PasswordAccountService.inspectConfirmation", () => {
  it("reports a valid link with its address and never consumes it", async () => {
    const context = setup({ users: [unconfirmed()], tokens: [{ raw: RAW }] });
    await expect(context.service.inspectConfirmation(RAW)).resolves.toEqual({ status: "valid", email: EMAIL });
    expect(consumeSingleUseToken).not.toHaveBeenCalled();
    expect(context.em.transactional).not.toHaveBeenCalled();
    expect(context.tokens[0]!.consumedAt).toBeNull();
  });

  it.each([
    ["expired", [unconfirmed()], { expiresAt: NOW }, "expired"],
    ["used, address confirmed", [confirmed()], { consumedAt: NOW }, "used"],
    ["used, address not confirmed", [unconfirmed()], { consumedAt: NOW }, "invalid"],
    ["still unused, but the address is already confirmed", [confirmed()], {}, "used"],
    ["bound to another address than the account's", [unconfirmed({ email: "new@example.com" })], { email: EMAIL }, "invalid"],
  ])("reports a link that is %s", async (_label, users, fields, status) => {
    const context = setup({ users, tokens: [{ raw: RAW, ...fields }] });
    await expect(context.service.inspectConfirmation(RAW)).resolves.toEqual({ status });
  });

  it("reports an unknown token, and a token whose account is gone, as invalid", async () => {
    const context = setup({ users: [unconfirmed()], tokens: [{ raw: RAW }] });
    await expect(context.service.inspectConfirmation("unknown")).resolves.toEqual({ status: "invalid" });
    context.users.delete("u1");
    await expect(context.service.inspectConfirmation(RAW)).resolves.toEqual({ status: "invalid" });
  });
});

describe("PasswordAccountService.confirmEmail", () => {
  it("consumes the link, confirms the address and writes the session in one transaction; the cookie follows the commit", async () => {
    const context = setup({ users: [unconfirmed()], tokens: [{ raw: RAW }] });
    const cookies = new ResponseCookies();
    expect(await context.service.confirmEmail(confirmInput(RAW, { returnTo: "/invite/x" }), IP, cookies)).toEqual({ redirectTo: "/invite/x" });
    expect(context.users.get("u1")!.emailConfirmedAt).toEqual(NOW);
    expect(context.tokens[0]!.consumedAt).toEqual(NOW);
    expect(context.authSessionService.create).toHaveBeenCalledWith("u1", context.tx);
    expect(context.authSessionService.setCookie).toHaveBeenCalledWith(cookies, "session-token");
    expect(cookies.toHeaderValues()[0]).toContain("devmentor_session=session-token");
    expect(context.events).toEqual([
      `limit ${keys.signInIp}`, `limit ${keys.signInEmail}`, "compare", "begin", "lock", "consume", "session create", "commit", "cookie",
    ]);
    expect(context.tx.findOne).toHaveBeenCalledWith(User, { id: "u1" }, { lockMode: LockMode.PESSIMISTIC_WRITE });
  });

  it("redirects to / without a returnTo and skips rule 1 for an unknown IP", async () => {
    const context = setup({ users: [unconfirmed()], tokens: [{ raw: RAW }] });
    expect(await context.service.confirmEmail(confirmInput(RAW), null, new ResponseCookies())).toEqual({ redirectTo: "/" });
    expect(context.rateLimiter.hit.mock.calls.map(([key]) => key)).toEqual([keys.signInEmail]);
  });

  it("answers 401 for a wrong password and consumes nothing", async () => {
    const context = setup({ users: [unconfirmed()], tokens: [{ raw: RAW }] });
    expect(await failure(context.service.confirmEmail(confirmInput(RAW, { password: "wrong" }), null, new ResponseCookies())))
      .toMatchObject({ code: "invalid_credentials", status: 401 });
    expect(consumeSingleUseToken).not.toHaveBeenCalled();
    expect(context.tokens[0]!.consumedAt).toBeNull();
    expect(context.users.get("u1")!.emailConfirmedAt).toBeNull();
    expect(context.authSessionService.create).not.toHaveBeenCalled();
  });

  it("keys rule 2 on the link's account, so it shares the sign-in bucket", async () => {
    const context = setup({ users: [unconfirmed({ email: "owner@example.com" })], tokens: [{ raw: RAW, email: "owner@example.com" }], refused: ["sign-in:email:owner@example.com"] });
    expect(await failure(context.service.confirmEmail(confirmInput(RAW), null, new ResponseCookies()))).toMatchObject({ code: "rate_limited" });
    expect(context.passwordHasher.compare).not.toHaveBeenCalled();
  });

  it("refuses past rule 1 before reading the link or comparing", async () => {
    const context = setup({ users: [unconfirmed()], tokens: [{ raw: RAW }], refused: [keys.signInIp] });
    expect(await failure(context.service.confirmEmail(confirmInput(RAW), IP, new ResponseCookies()))).toMatchObject({ code: "rate_limited", status: 429 });
    expect(context.events).toEqual([`limit ${keys.signInIp}`]);
    expect(inspectSingleUseToken).not.toHaveBeenCalled();
  });

  it.each([
    ["expired", [unconfirmed()], { expiresAt: NOW }, "expired", true],
    ["used", [confirmed()], { consumedAt: NOW }, "used", true],
    ["invalid", [unconfirmed()], { consumedAt: NOW }, "invalid", false],
  ])("answers 404 with the reason for an %s link without checking the password", async (_label, users, fields, problem, countsEmail) => {
    const context = setup({ users, tokens: [{ raw: RAW, ...fields }] });
    expect(await failure(context.service.confirmEmail(confirmInput(RAW), null, new ResponseCookies())))
      .toMatchObject({ code: "not_found", status: 404, message: CONFIRMATION_LINK_MESSAGES[problem as "used"] });
    expect(context.rateLimiter.hit.mock.calls.map(([key]) => key)).toEqual(countsEmail ? [keys.signInEmail] : []);
    expect(context.passwordHasher.compare).not.toHaveBeenCalled();
    expect(context.em.transactional).not.toHaveBeenCalled();
  });

  it("answers 404 invalid for an unknown token without an email rule hit", async () => {
    const context = setup();
    expect(await failure(context.service.confirmEmail(confirmInput("unknown"), null, new ResponseCookies())))
      .toMatchObject({ status: 404, message: "This link isn't valid. Sign in to continue" });
    expect(context.rateLimiter.hit).not.toHaveBeenCalled();
  });

  it("uses reason-specific messages", () => {
    expect(CONFIRMATION_LINK_MESSAGES).toEqual({
      expired: "This link has expired. Sign in to get a new one",
      used: "Your address is already confirmed. Sign in",
      invalid: "This link isn't valid. Sign in to continue",
    });
  });

  it.each([
    ["another tab consumed the link first", (context: Context) => { context.tokens[0]!.consumedAt = NOW; context.users.get("u1")!.emailConfirmedAt = NOW; }, "used"],
    ["the link expired meanwhile", (context: Context) => { context.tokens[0]!.expiresAt = NOW; }, "expired"],
    ["a newer registration deleted the link", (context: Context) => { context.tokens.splice(0); }, "invalid"],
    ["the link was used but the address is not confirmed", (context: Context) => { context.tokens[0]!.consumedAt = NOW; }, "invalid"],
    ["the account's address changed", (context: Context) => { context.users.get("u1")!.email = "new@example.com"; }, "invalid"],
    ["the account disappeared", (context: Context) => { context.users.delete("u1"); }, "invalid"],
  ])("answers 404 and rolls back when %s while waiting for the lock", async (_label, change, problem) => {
    const context = setup({ users: [unconfirmed()], tokens: [{ raw: RAW }] });
    context.hooks.beforeLock = () => change(context);
    expect(await failure(context.service.confirmEmail(confirmInput(RAW), null, new ResponseCookies())))
      .toMatchObject({ code: "not_found", message: CONFIRMATION_LINK_MESSAGES[problem as "used"] });
    expect(context.events).toContain("rollback");
    expect(context.authSessionService.create).not.toHaveBeenCalled();
    expect(context.authSessionService.setCookie).not.toHaveBeenCalled();
  });

  it("answers 401 and consumes nothing when the password was replaced while waiting for the lock", async () => {
    const context = setup({ users: [unconfirmed()], tokens: [{ raw: RAW }] });
    context.hooks.beforeLock = () => { context.users.get("u1")!.passwordHash = hashOf("newer long phrase"); };
    expect(await failure(context.service.confirmEmail(confirmInput(RAW), null, new ResponseCookies()))).toMatchObject({ code: "invalid_credentials" });
    expect(consumeSingleUseToken).not.toHaveBeenCalled();
  });

  it("runs a dummy compare and answers 401 for a valid link to an account without a password", async () => {
    const context = setup({ users: [unconfirmed({ passwordHash: null })], tokens: [{ raw: RAW }] });
    expect(await failure(context.service.confirmEmail(confirmInput(RAW), null, new ResponseCookies()))).toMatchObject({ code: "invalid_credentials" });
    expect(context.passwordHasher.dummyCompare).toHaveBeenCalledWith(PASSWORD);
    expect(context.em.transactional).not.toHaveBeenCalled();
  });

  it("rolls the confirmation back when the session write fails, setting no cookie", async () => {
    const context = setup({ users: [unconfirmed()], tokens: [{ raw: RAW }] });
    const broken = new Error("insert failed");
    context.authSessionService.create.mockRejectedValueOnce(broken);
    await expect(context.service.confirmEmail(confirmInput(RAW), null, new ResponseCookies())).rejects.toBe(broken);
    expect(context.users.get("u1")!.emailConfirmedAt).toBeNull();
    expect(context.tokens[0]!.consumedAt).toBeNull();
    expect(context.authSessionService.setCookie).not.toHaveBeenCalled();
  });

  it("then lets the confirmed account sign in with the same password", async () => {
    const context = setup({ users: [unconfirmed()], tokens: [{ raw: RAW }] });
    await context.service.confirmEmail(confirmInput(RAW), null, new ResponseCookies());
    await expect(context.service.signIn(credentials(), null, new ResponseCookies())).resolves.toEqual({ redirectTo: "/" });
    await expect(context.service.inspectConfirmation(RAW)).resolves.toEqual({ status: "used" });
  });
});
