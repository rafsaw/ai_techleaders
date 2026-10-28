import { fixedClock, hashToken, ResponseCookies, type Clock } from "@devmentor/core";
import type { Role } from "@devmentor/core/validators/auth/role.schema";
import { AuthSession, UserRole, type EntityManager } from "@devmentor/db";
import { describe, expect, it, vi } from "vitest";

import { createAppConfig } from "@/server/config";
import { RoleService } from "@/server/services/auth/role.service";
import {
  AuthSessionService,
  SESSION_LIFETIME_MS,
  SESSION_TOUCH_INTERVAL_MS,
} from "@/server/services/auth/auth-session.service";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const NOW = new Date("2026-10-27T12:00:00.000Z");
const TOKEN = "A".repeat(43);
const COOKIE = `devmentor_session=${TOKEN}`;

type Row = { id: string; tokenHash: string; expiresAt: Date; updatedAt?: Date; user: { id: string; name: string } };
type Where = Record<string, unknown>;

/** Evaluates the subset of MikroORM filters the service uses against a row. */
function matches(row: Row, where: Where): boolean {
  return Object.entries(where).every(([key, condition]) => {
    const value = (row as unknown as Record<string, unknown>)[key];
    if (condition && typeof condition === "object" && !(condition instanceof Date)) {
      const ops = condition as { $gt?: Date; $lte?: Date };
      const time = (value as Date).getTime();
      return (ops.$gt === undefined || time > ops.$gt.getTime())
        && (ops.$lte === undefined || time <= ops.$lte.getTime());
    }
    return value === condition;
  });
}

/** An in-memory `auth_sessions` table behind the `em` methods the service calls. */
function fakeEm(initial: Row[] = []) {
  const rows = new Map(initial.map((row) => [row.id, { ...row }]));
  let created: Row | undefined;
  const em = {
    rows,
    findOne: vi.fn(async (_entity: unknown, where: Where, options: unknown) => {
      expect(options).toEqual({ populate: ["user"] });
      const row = [...rows.values()].find((candidate) => matches(candidate, where));
      return row ? { ...row } : null;
    }),
    nativeUpdate: vi.fn(async (_entity: unknown, where: Where, data: Partial<Row>) => {
      let count = 0;
      for (const row of rows.values()) if (matches(row, where)) { Object.assign(row, data); count += 1; }
      return count;
    }),
    nativeDelete: vi.fn(async (_entity: unknown, where: Where) => {
      let count = 0;
      for (const row of [...rows.values()]) if (matches(row, where)) { rows.delete(row.id); count += 1; }
      return count;
    }),
    create: vi.fn((_entity: unknown, data: { user: string; tokenHash: string; expiresAt: Date }) => {
      created = { id: `session-${rows.size + 1}`, ...data, user: { id: data.user, name: "New" } };
      return created;
    }),
    persist: vi.fn(() => ({ flush: vi.fn(async () => { rows.set(created!.id, created!); }) })),
  };
  return em;
}

function session(expiresAt: Date, overrides: Partial<Row> = {}): Row {
  return { id: "s-1", tokenHash: hashToken(TOKEN), expiresAt, user: { id: "u-1", name: "Ada" }, ...overrides };
}

function setup({ rows = [] as Row[], clock = fixedClock(NOW), roles = ["mentee"] as Role[], appUrl = "http://localhost:3000" } = {}) {
  const em = fakeEm(rows);
  const roleService = { rolesOf: vi.fn().mockResolvedValue(roles) };
  const config = createAppConfig({ APP_URL: appUrl });
  const service = new AuthSessionService({
    em: em as unknown as EntityManager,
    clock,
    roleService: roleService as never,
    config,
  });
  return { em, roleService, service, config };
}

function request(cookie?: string) {
  return new Request("http://localhost/api/x", cookie ? { headers: { cookie } } : {});
}

describe("AuthSessionService constants", () => {
  it("expires sessions after 30 days and touches at most hourly", () => {
    expect(SESSION_LIFETIME_MS).toBe(30 * DAY);
    expect(SESSION_TOUCH_INTERVAL_MS).toBe(HOUR);
  });
});

describe("AuthSessionService.resolve", () => {
  it("returns null without reading config or the database when no session cookie is presented", async () => {
    const em = fakeEm();
    const config = { app: vi.fn() };
    const service = new AuthSessionService({ em: em as unknown as EntityManager, clock: fixedClock(NOW),
      roleService: { rolesOf: vi.fn() } as never, config: config as never });
    const cookies = new ResponseCookies();
    await expect(service.resolve(request("other=1"), cookies)).resolves.toBeNull();
    await expect(service.resolve(request(), cookies)).resolves.toBeNull();
    expect(config.app).not.toHaveBeenCalled();
    expect(em.findOne).not.toHaveBeenCalled();
    expect(cookies.toHeaderValues()).toEqual([]);
  });

  it("ignores a cookie named for the other scheme without touching the database", async () => {
    const { em, service } = setup({ rows: [session(new Date(NOW.getTime() + DAY))], appUrl: "https://devmentor.example" });
    const cookies = new ResponseCookies();
    await expect(service.resolve(request(COOKIE), cookies)).resolves.toBeNull();
    expect(em.findOne).not.toHaveBeenCalled();
    expect(cookies.toHeaderValues()).toEqual([]);
  });

  it("returns the principal with live roles, moves expiry to 30 days from request time and renews the cookie", async () => {
    const { em, roleService, service } = setup({ rows: [session(new Date(NOW.getTime() + 10 * DAY))], roles: ["mentee", "operator"] });
    const cookies = new ResponseCookies();
    await expect(service.resolve(request(COOKIE), cookies)).resolves.toEqual({
      userId: "u-1", sessionId: "s-1", displayName: "Ada", roles: ["mentee", "operator"],
    });
    expect(em.findOne).toHaveBeenCalledWith(AuthSession, { tokenHash: hashToken(TOKEN) }, { populate: ["user"] });
    expect(roleService.rolesOf).toHaveBeenCalledWith("u-1");
    expect(em.rows.get("s-1")!.expiresAt).toEqual(new Date(NOW.getTime() + 30 * DAY));
    expect(em.rows.get("s-1")!.updatedAt).toEqual(NOW);
    expect(cookies.toHeaderValues()).toEqual([`devmentor_session=${TOKEN}; Max-Age=2592000; Path=/; HttpOnly; SameSite=Lax`]);
  });

  it("uses the __Host- cookie on an https APP_URL", async () => {
    const { service } = setup({ rows: [session(new Date(NOW.getTime() + DAY))], appUrl: "https://devmentor.example" });
    const cookies = new ResponseCookies();
    const principal = await service.resolve(request(`__Host-devmentor_session=${TOKEN}`), cookies);
    expect(principal?.sessionId).toBe("s-1");
    expect(cookies.toHeaderValues()[0]).toMatch(/^__Host-devmentor_session=A{43}; Max-Age=2592000; Path=\/; HttpOnly; Secure; SameSite=Lax$/);
  });

  it("clears the cookie of an unknown token", async () => {
    const { service } = setup();
    const cookies = new ResponseCookies();
    await expect(service.resolve(request(`devmentor_session=${"B".repeat(43)}`), cookies)).resolves.toBeNull();
    expect(cookies.toHeaderValues()[0]).toMatch(/^devmentor_session=; Max-Age=0;/);
  });

  it("clears a malformed cookie without querying the database", async () => {
    const { em, service } = setup();
    const cookies = new ResponseCookies();
    await expect(service.resolve(request("devmentor_session=short"), cookies)).resolves.toBeNull();
    expect(em.findOne).not.toHaveBeenCalled();
    expect(cookies.has("devmentor_session")).toBe(true);
  });

  it("denies a session at its exact expiry, deletes the row and clears the cookie", async () => {
    const { em, roleService, service } = setup({ rows: [session(new Date(NOW))] });
    const cookies = new ResponseCookies();
    await expect(service.resolve(request(COOKIE), cookies)).resolves.toBeNull();
    expect(em.nativeDelete).toHaveBeenCalledWith(AuthSession, { id: "s-1", expiresAt: { $lte: NOW } });
    expect(em.rows.has("s-1")).toBe(false);
    expect(roleService.rolesOf).not.toHaveBeenCalled();
    expect(cookies.toHeaderValues()[0]).toMatch(/Max-Age=0/);
  });

  it("accepts a session one millisecond before expiry", async () => {
    const { em, service } = setup({ rows: [session(new Date(NOW.getTime() + 1))] });
    await expect(service.resolve(request(COOKIE), new ResponseCookies())).resolves.not.toBeNull();
    expect(em.rows.get("s-1")!.expiresAt).toEqual(new Date(NOW.getTime() + 30 * DAY));
  });

  it("propagates database failures (callers fail closed)", async () => {
    const { em, service } = setup();
    em.findOne.mockRejectedValueOnce(new Error("db down"));
    await expect(service.resolve(request(COOKIE), new ResponseCookies())).rejects.toThrow("db down");
  });
});

describe("AuthSessionService activity throttle", () => {
  // Expiry left on the row = when it was last moved + 30 days.
  const movedAgo = (ms: number) => new Date(NOW.getTime() + 30 * DAY - ms);

  it.each([
    ["just under one hour ago", HOUR - 1, false],
    ["exactly one hour ago", HOUR, true],
    ["just over one hour ago", HOUR + 1, true],
    ["at day 29 (one day of validity left)", 29 * DAY, true],
    ["one second ago", 1000, false],
  ])("expiry moved %s → write %s", async (_label, ago, writes) => {
    const before = movedAgo(ago);
    const { em, service } = setup({ rows: [session(before)] });
    const cookies = new ResponseCookies();
    await expect(service.resolveToken(TOKEN)).resolves.toMatchObject({ sessionId: "s-1" });
    expect(em.nativeUpdate).toHaveBeenCalledTimes(writes ? 1 : 0);
    expect(em.rows.get("s-1")!.expiresAt).toEqual(writes ? new Date(NOW.getTime() + 30 * DAY) : before);
    expect(cookies.toHeaderValues()).toEqual([]);
  });

  it("guards the write with an unexpired, not-recently-moved condition", async () => {
    const { em, service } = setup({ rows: [session(new Date(NOW.getTime() + DAY))] });
    await service.resolveToken(TOKEN);
    expect(em.nativeUpdate).toHaveBeenCalledWith(
      AuthSession,
      { id: "s-1", expiresAt: { $gt: NOW, $lte: new Date(NOW.getTime() + 30 * DAY - HOUR) } },
      { expiresAt: new Date(NOW.getTime() + 30 * DAY), updatedAt: NOW },
    );
  });

  it("never shortens expiry when a concurrent request moved it further", async () => {
    const { em, service } = setup({ rows: [session(new Date(NOW.getTime() + DAY))] });
    const later = new Date(NOW.getTime() + 30 * DAY + 5 * HOUR);
    // Another instance (with a later clock) extends the row after our read.
    em.findOne.mockImplementationOnce(async (_e, where) => {
      const row = [...em.rows.values()].find((candidate) => matches(candidate, where))!;
      const snapshot = { ...row };
      row.expiresAt = later;
      return snapshot;
    });
    await expect(service.resolveToken(TOKEN)).resolves.not.toBeNull();
    expect(em.nativeUpdate).toHaveBeenCalledOnce();
    expect(em.rows.get("s-1")!.expiresAt).toEqual(later);
  });

  it("never resurrects a row deleted (signed out) after it was read", async () => {
    const { em, service } = setup({ rows: [session(new Date(NOW.getTime() + DAY))] });
    em.findOne.mockImplementationOnce(async (_e, where) => {
      const row = [...em.rows.values()].find((candidate) => matches(candidate, where))!;
      em.rows.delete(row.id);
      return { ...row };
    });
    await service.resolveToken(TOKEN);
    await expect(em.nativeUpdate.mock.results[0]!.value).resolves.toBe(0);
    expect(em.rows.size).toBe(0);
  });

  it("never extends a row that expired after it was read", async () => {
    const clock: Clock = fixedClock(NOW);
    const { em, service } = setup({ rows: [session(new Date(NOW.getTime() + DAY))], clock });
    em.findOne.mockImplementationOnce(async (_e, where) => {
      const row = [...em.rows.values()].find((candidate) => matches(candidate, where))!;
      const snapshot = { ...row };
      row.expiresAt = new Date(NOW); // expired meanwhile
      return snapshot;
    });
    await service.resolveToken(TOKEN);
    expect(em.rows.get("s-1")!.expiresAt).toEqual(NOW);
  });

  it("rejects malformed tokens before hashing or querying", async () => {
    const { em, service } = setup();
    await expect(service.resolveToken("")).resolves.toBeNull();
    await expect(service.resolveToken(`${TOKEN}x`)).resolves.toBeNull();
    expect(em.findOne).not.toHaveBeenCalled();
  });
});

describe("AuthSessionService start and end", () => {
  it("starts a session storing only the token hash, expiring in 30 days, and sets the cookie", async () => {
    const { em, service } = setup();
    const cookies = new ResponseCookies();
    await service.start("u-7", cookies);
    const [header] = cookies.toHeaderValues();
    const token = /^devmentor_session=([A-Za-z0-9_-]{43}); Max-Age=2592000; Path=\/; HttpOnly; SameSite=Lax$/.exec(header!)![1]!;
    expect(em.create).toHaveBeenCalledWith(AuthSession, {
      user: "u-7", tokenHash: hashToken(token), expiresAt: new Date(NOW.getTime() + 30 * DAY),
    });
    const stored = [...em.rows.values()][0]!;
    expect(stored.tokenHash).not.toContain(token);
    // The new cookie resolves to the new session.
    await expect(service.resolveToken(token)).resolves.toMatchObject({ userId: "u-7", sessionId: stored.id });
  });

  it("start overrides a renewal written earlier in the same response", async () => {
    const { service } = setup({ rows: [session(new Date(NOW.getTime() + DAY))] });
    const cookies = new ResponseCookies();
    await service.resolve(request(COOKIE), cookies);
    await service.start("u-1", cookies);
    expect(cookies.toHeaderValues()).toHaveLength(1);
    expect(cookies.toHeaderValues()[0]).not.toContain(TOKEN);
  });

  it("ends a session: deletes its row, clears the cookie, and the token stops resolving", async () => {
    const { em, service } = setup({ rows: [session(new Date(NOW.getTime() + DAY)), session(new Date(NOW.getTime() + DAY), { id: "s-2", tokenHash: "other" })] });
    const cookies = new ResponseCookies();
    await service.resolve(request(COOKIE), cookies);
    await service.end("s-1", cookies);
    expect(em.nativeDelete).toHaveBeenCalledWith(AuthSession, { id: "s-1" });
    expect(cookies.toHeaderValues()).toEqual(["devmentor_session=; Max-Age=0; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax"]);
    expect([...em.rows.keys()]).toEqual(["s-2"]);
    await expect(service.resolveToken(TOKEN)).resolves.toBeNull();
  });
});

describe("AuthSessionService live roles", () => {
  it("sees operator grant/revoke on the next resolution and leaves the session untouched", async () => {
    // A real RoleService over in-memory sessions and user_roles tables.
    const em = fakeEm([session(new Date(NOW.getTime() + 30 * DAY))]);
    const roleRows: { user: string; role: Role }[] = [{ user: "u-1", role: "mentee" }];
    const roleEm = {
      find: vi.fn(async (_e: unknown, where: { user: string }) => roleRows.filter((row) => row.user === where.user)),
      count: vi.fn(async (_e: unknown, where: { user: string; role: Role }) =>
        roleRows.filter((row) => row.user === where.user && row.role === where.role).length),
      upsert: vi.fn(async (_e: unknown, data: { user: string; role: Role }) => { roleRows.push(data); return data; }),
      nativeDelete: vi.fn(async (entity: unknown, where: Where) => {
        if (entity !== UserRole) return em.nativeDelete(entity, where);
        const index = roleRows.findIndex((row) => row.user === where.user && row.role === where.role);
        if (index >= 0) roleRows.splice(index, 1);
        return index >= 0 ? 1 : 0;
      }),
    };
    const sharedEm = { ...em, ...roleEm } as unknown as EntityManager;
    const roleService = new RoleService({ em: sharedEm });
    const service = new AuthSessionService({ em: sharedEm, clock: fixedClock(NOW), roleService,
      config: createAppConfig({ APP_URL: "http://localhost:3000" }) });
    const resolveRoles = async () => (await service.resolve(request(COOKIE), new ResponseCookies()))!.roles;

    expect(await resolveRoles()).toEqual(["mentee"]);
    await expect(roleService.grant("u-1", "operator")).resolves.toBe(true);
    expect(await resolveRoles()).toEqual(["mentee", "operator"]);
    await expect(roleService.revokeOperator("u-1")).resolves.toBe(true);
    expect(await resolveRoles()).toEqual(["mentee"]);
    expect([...em.rows.values()]).toEqual([session(new Date(NOW.getTime() + 30 * DAY))]);
    expect(em.nativeUpdate).not.toHaveBeenCalled();
  });
});
