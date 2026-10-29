import { fixedClock, hashToken, type Principal } from "@devmentor/core";
import type { Role } from "@devmentor/core/validators/auth/role.schema";
import type { EntityManager } from "@devmentor/db";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createAppConfig } from "@/server/config";
import { AuthSessionService } from "@/server/services/auth/auth-session.service";
import { RoleService } from "@/server/services/auth/role.service";

// React's real server `cache()` (the react-server build Next uses for Server
// Components), with a fake render dispatcher: each simulated request gets a
// fresh cache, exactly like one RSC render.
const { reactServer, nav, headerState, scopes } = vi.hoisted(() => ({
  reactServer: {} as { internals?: { A: unknown } },
  nav: {
    redirect: (url: string): never => { throw Object.assign(new Error("NEXT_REDIRECT"), { url }); },
    notFound: (): never => { throw new Error("NEXT_NOT_FOUND"); },
  },
  headerState: { current: new Headers() },
  scopes: { create: (): unknown => { throw new Error("no scope factory"); }, count: 0 },
}));
vi.mock("react", async () => {
  const { createRequire } = await import("node:module");
  const { dirname, join } = await import("node:path");
  const require = createRequire(import.meta.url);
  const mod = require(join(dirname(require.resolve("react")), "cjs/react.react-server.development.js"));
  reactServer.internals = mod.__SERVER_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  return mod;
});
vi.mock("next/headers", () => ({ headers: vi.fn(async () => headerState.current) }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(nav.redirect), notFound: vi.fn(nav.notFound) }));
vi.mock("@/server/container", () => ({
  createRequestScope: () => { scopes.count += 1; return scopes.create(); },
}));

const { getPrincipal, requirePrincipal, requireRole } = await import("@/server/auth/page-guards");
const { proxy } = await import("@/proxy");

const NOW = new Date("2026-10-27T12:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;
const TOKEN = "A".repeat(43);
const UNKNOWN = "B".repeat(43);

type SessionRow = { id: string; tokenHash: string; expiresAt: Date; user: { id: string; name: string } };

/** In-memory `auth_sessions` and `user_roles` behind the real services. */
function database() {
  const sessions = new Map<string, SessionRow>([
    ["s-1", { id: "s-1", tokenHash: hashToken(TOKEN), expiresAt: new Date(NOW.getTime() + 10 * DAY), user: { id: "u-1", name: "Ada" } }],
  ]);
  const roles: { user: string; role: Role }[] = [{ user: "u-1", role: "mentee" }];
  const em = {
    findOne: vi.fn(async (_e: unknown, where: { tokenHash: string }) => {
      const row = [...sessions.values()].find((s) => s.tokenHash === where.tokenHash);
      return row ? { ...row } : null;
    }),
    find: vi.fn(async (_e: unknown, where: { user: string }) => roles.filter((r) => r.user === where.user)),
    nativeUpdate: vi.fn(async (_e: unknown, where: { id: string }, data: Partial<SessionRow>) => {
      const row = sessions.get(where.id);
      if (row) Object.assign(row, data);
      return row ? 1 : 0;
    }),
    nativeDelete: vi.fn(async (_e: unknown, where: { id: string }) => (sessions.delete(where.id) ? 1 : 0)),
  };
  return { sessions, roles, em };
}

let db: ReturnType<typeof database>;
const config = createAppConfig({ APP_URL: "http://localhost:3000" });

beforeEach(() => {
  vi.stubEnv("APP_URL", "http://localhost:3000");
  db = database();
  scopes.count = 0;
  scopes.create = () => {
    const em = db.em as unknown as EntityManager;
    const roleService = new RoleService({ em });
    return { cradle: { config, authSessionService: new AuthSessionService({ em, clock: fixedClock(NOW), roleService, config }) } };
  };
  headerState.current = new Headers();
});

afterEach(() => { reactServer.internals!.A = null; });

/** Runs `work` as one server render/request: one fresh React cache. */
async function request<T>(cookie: string | null, work: () => Promise<T>): Promise<T> {
  headerState.current = new Headers(cookie ? { cookie } : {});
  const caches = new Map<unknown, unknown>();
  reactServer.internals!.A = {
    getCacheForType: (create: () => unknown) => {
      if (!caches.has(create)) caches.set(create, create());
      return caches.get(create);
    },
    cacheSignal: () => null,
  };
  try {
    return await work();
  } finally {
    reactServer.internals!.A = null;
  }
}

async function caught(work: Promise<unknown>): Promise<Error & { url?: string }> {
  try {
    await work;
  } catch (error) {
    return error as Error & { url?: string };
  }
  throw new Error("expected the guard to interrupt rendering");
}

const SIGNED_IN = `devmentor_session=${TOKEN}`;

describe("getPrincipal", () => {
  it("returns null without a session cookie, touching neither config nor the DB", async () => {
    await expect(request(null, getPrincipal)).resolves.toBeNull();
    await expect(request("other=1", getPrincipal)).resolves.toBeNull();
    expect(scopes.count).toBe(0);
    expect(db.em.findOne).not.toHaveBeenCalled();
  });

  it("ignores a cookie under the other scheme's name", async () => {
    await expect(request(`__Host-devmentor_session=${TOKEN}`, getPrincipal)).resolves.toBeNull();
    expect(db.em.findOne).not.toHaveBeenCalled();
  });

  it("validates the session in the DB and returns the principal with live roles", async () => {
    const principal = await request(SIGNED_IN, getPrincipal);
    expect(principal).toEqual<Principal>({ userId: "u-1", sessionId: "s-1", displayName: "Ada", roles: ["mentee"] });
    expect(db.em.findOne).toHaveBeenCalledOnce();
  });

  it("records activity: a page read moves DB expiry to now + 30 days", async () => {
    await request(SIGNED_IN, getPrincipal);
    expect(db.sessions.get("s-1")!.expiresAt).toEqual(new Date(NOW.getTime() + 30 * DAY));
  });

  it("deduplicates within one render (layout + leaf) but re-checks the DB on every request", async () => {
    // Request 1: a full document visit renders the public layout/header and the leaf.
    await request(SIGNED_IN, async () => {
      const [layout, leaf] = await Promise.all([getPrincipal(), getPrincipal()]);
      expect(leaf).toBe(layout);
    });
    expect(db.em.findOne).toHaveBeenCalledTimes(1);
    // Request 2: public-to-public client (RSC) navigation or a prefetch; the
    // layout is reused and only the new leaf renders. Its own check hits the DB.
    await request(SIGNED_IN, getPrincipal);
    expect(db.em.findOne).toHaveBeenCalledTimes(2);
    expect(scopes.count).toBe(2);
  });

  it("does not cache roles between requests: grant and revoke apply on the next request", async () => {
    await expect(request(SIGNED_IN, getPrincipal)).resolves.toMatchObject({ roles: ["mentee"] });
    db.roles.push({ user: "u-1", role: "operator" });
    await expect(request(SIGNED_IN, getPrincipal)).resolves.toMatchObject({ roles: ["mentee", "operator"] });
    db.roles.splice(1, 1);
    await expect(request(SIGNED_IN, getPrincipal)).resolves.toMatchObject({ roles: ["mentee"] });
  });

  it("extends nothing when no request reaches the server (browser-memory navigation, idle tab)", async () => {
    const before = db.sessions.get("s-1")!.expiresAt;
    // No render happens, so no guard runs and the DB is never written.
    expect(db.em.findOne).not.toHaveBeenCalled();
    expect(db.em.nativeUpdate).not.toHaveBeenCalled();
    expect(db.sessions.get("s-1")!.expiresAt).toBe(before);
  });
});

describe("requirePrincipal", () => {
  it("returns the principal when signed in", async () => {
    await expect(request(SIGNED_IN, () => requirePrincipal({ returnTo: "/account" }))).resolves.toMatchObject({ userId: "u-1" });
  });

  it("redirects to sign-in with an encoded returnTo when signed out", async () => {
    const error = await caught(request(null, () => requirePrincipal({ returnTo: "/account?tab=a&x=1" })));
    expect(error.url).toBe(`/sign-in?returnTo=${encodeURIComponent("/account?tab=a&x=1")}`);
  });

  it("falls back to / for an unsafe returnTo", async () => {
    for (const returnTo of ["https://evil.example", "//evil.example", "/api/users"]) {
      const error = await caught(request(null, () => requirePrincipal({ returnTo })));
      expect(error.url).toBe("/sign-in?returnTo=%2F");
    }
  });

  it("adds no session-expired banner for a cookie this origin never issued", async () => {
    const error = await caught(request(`__Host-devmentor_session=${TOKEN}`, () => requirePrincipal({ returnTo: "/account" })));
    expect(error.url).toBe("/sign-in?returnTo=%2Faccount");
  });
});

describe("requireRole", () => {
  it("returns the principal holding the role", async () => {
    db.roles.push({ user: "u-1", role: "operator" });
    await expect(request(SIGNED_IN, () => requireRole("operator", { returnTo: "/backend" }))).resolves.toMatchObject({ roles: ["mentee", "operator"] });
  });

  it("answers notFound for a signed-in account without the role", async () => {
    const error = await caught(request(SIGNED_IN, () => requireRole("operator", { returnTo: "/backend" })));
    expect(error.message).toBe("NEXT_NOT_FOUND");
  });

  it("redirects a signed-out visitor to sign-in", async () => {
    const error = await caught(request(null, () => requireRole("operator", { returnTo: "/backend/users" })));
    expect(error.url).toBe("/sign-in?returnTo=%2Fbackend%2Fusers");
  });

  it("denies again on the next request after an operator revoke, while still signed in", async () => {
    db.roles.push({ user: "u-1", role: "operator" });
    await request(SIGNED_IN, () => requireRole("operator", { returnTo: "/backend" }));
    db.roles.splice(1, 1);
    const error = await caught(request(SIGNED_IN, () => requireRole("operator", { returnTo: "/backend" })));
    expect(error.message).toBe("NEXT_NOT_FOUND");
    await expect(request(SIGNED_IN, getPrincipal)).resolves.not.toBeNull();
  });
});

describe("Proxy renewal grants nothing", () => {
  function renewed(token: string) {
    const response = proxy(new NextRequest("http://localhost:3000/account", { headers: { cookie: `devmentor_session=${token}` } }));
    return response.headers.getSetCookie();
  }

  it("an unknown token that Proxy re-sent still fails DB validation", async () => {
    expect(renewed(UNKNOWN)).toHaveLength(1);
    await expect(request(`devmentor_session=${UNKNOWN}`, getPrincipal)).resolves.toBeNull();
    expect(db.em.findOne).toHaveBeenCalledOnce();
    const error = await caught(request(`devmentor_session=${UNKNOWN}`, () => requirePrincipal({ returnTo: "/account" })));
    expect(error.url).toBe("/sign-in?error=session_expired&returnTo=%2Faccount");
  });

  it("an expired session that Proxy re-sent is denied and deleted", async () => {
    db.sessions.get("s-1")!.expiresAt = NOW;
    expect(renewed(TOKEN)).toHaveLength(1);
    await expect(request(SIGNED_IN, getPrincipal)).resolves.toBeNull();
    expect(db.sessions.has("s-1")).toBe(false);
  });

  it("sends an expired session to sign-in with the session-expired banner and the safe returnTo (SM-AC2)", async () => {
    db.sessions.get("s-1")!.expiresAt = NOW;
    const error = await caught(request(SIGNED_IN, () => requirePrincipal({ returnTo: "/account?tab=a" })));
    expect(error.url).toBe("/sign-in?error=session_expired&returnTo=%2Faccount%3Ftab%3Da");
  });

  it("a revoked (signed-out) session that Proxy re-sent is denied", async () => {
    db.sessions.delete("s-1");
    expect(renewed(TOKEN)).toHaveLength(1);
    await expect(request(SIGNED_IN, getPrincipal)).resolves.toBeNull();
    const error = await caught(request(SIGNED_IN, () => requireRole("operator", { returnTo: "/backend" })));
    expect(error.url).toBe("/sign-in?error=session_expired&returnTo=%2Fbackend");
  });
});
