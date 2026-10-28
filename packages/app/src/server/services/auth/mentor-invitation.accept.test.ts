import { fixedClock, generateToken, hashToken, isAppError, type AppError, type Principal } from "@devmentor/core";
import { LockMode, MentorInvitation, User, UserRole, type EntityManager } from "@devmentor/db";
import { describe, expect, it, vi } from "vitest";

import { createAppConfig } from "@/server/config";
import {
  ALREADY_MENTOR_MESSAGE,
  INVITATION_EMAIL_MISMATCH_MESSAGE,
  MentorInvitationService,
} from "@/server/services/auth/mentor-invitation.service";
import { RoleService } from "@/server/services/auth/role.service";
import { UserService } from "@/server/services/auth/user.service";
import { MemoryEmailSender } from "@/server/services/notifications/adapters/memory-email-sender";

const NOW = new Date("2026-10-28T12:00:00.000Z");
const LATER = new Date("2026-11-11T12:00:00.000Z");
const EMAIL = "ada@example.com";
const TOKEN = generateToken();

type UserRow = {
  id: string; email: string; name: string; emailConfirmedAt: Date | null; githubId: string | null; passwordHash: string | null;
};
type RoleRow = { user: UserRow; role: string; invitation: InvitationRow | null };
type InvitationRow = {
  id: string; email: string; tokenHash: string; expiresAt: Date; consumedAt: Date | null; revokedAt: Date | null;
  acceptedBy: UserRow | null;
};

function userRow(overrides: Partial<UserRow> = {}): UserRow {
  return { id: "u-1", email: EMAIL, name: "Ada Nowak", emailConfirmedAt: NOW, githubId: "42", passwordHash: null, ...overrides };
}

function invitationRow(overrides: Partial<InvitationRow> = {}): InvitationRow {
  return {
    id: "inv-1", email: EMAIL, tokenHash: hashToken(TOKEN), expiresAt: LATER, consumedAt: null, revokedAt: null, acceptedBy: null,
    ...overrides,
  };
}

const principalOf = (user: UserRow): Principal => ({ userId: user.id, sessionId: "session-1", displayName: user.name, roles: [] });

/**
 * In-memory `users`, `user_roles` and `mentor_invitations` behind the `em`
 * calls of the invitation, role and user services, with one ordered `events`
 * log (transaction, locks, consume, grant), the unique `(user_id, role)` and
 * mentor-only `invitation_id` rules enforced on commit, and a rollback that
 * restores every row. Any other entity (sessions included) fails the test.
 */
function setup({ users = [userRow()], roles = ["mentee"] as string[], invitations = [invitationRow()] } = {}) {
  const events: string[] = [];
  const userTable = users.map((item) => ({ ...item }));
  const invitationTable = invitations.map((item) => ({ ...item }));
  const roleTable: RoleRow[] = roles.map((role) => ({ user: userTable[0]!, role, invitation: null }));
  const hooks: { beforeConsume?: () => void } = {};
  let pendingRoles: RoleRow[] = [];

  const idOf = (value: unknown) => (typeof value === "string" ? value : (value as { id: string }).id);

  function ops(inTransaction: boolean) {
    return {
      isInTransaction: () => inTransaction,
      findOne: vi.fn(async (entity: unknown, where: Record<string, unknown>, options?: { lockMode?: LockMode }) => {
        if (options?.lockMode !== undefined) {
          expect(inTransaction).toBe(true);
          expect(options.lockMode).toBe(LockMode.PESSIMISTIC_WRITE);
        }
        if (entity === User) {
          if (options?.lockMode !== undefined) events.push("lock user");
          return userTable.find((item) => item.id === where.id) ?? null;
        }
        if (entity === MentorInvitation) {
          if (options?.lockMode !== undefined) events.push("lock invitation");
          expect(Object.keys(where)).toEqual(["tokenHash"]);
          return invitationTable.find((item) => item.tokenHash === where.tokenHash) ?? null;
        }
        throw new Error(`unexpected findOne(${String(entity)})`);
      }),
      find: vi.fn(async (entity: unknown, where: { user: string }) => {
        expect(entity).toBe(UserRole);
        return roleTable.filter((item) => item.user.id === where.user);
      }),
      count: vi.fn(async (entity: unknown, where: { user: string; role: string }) => {
        expect(entity).toBe(UserRole);
        return roleTable.filter((item) => item.user.id === where.user && item.role === where.role).length;
      }),
      nativeUpdate: vi.fn(async (entity: unknown, where: { id: string; consumedAt: null; expiresAt: { $gt: Date } }, data: { consumedAt: Date }) => {
        expect(entity).toBe(MentorInvitation);
        events.push("consume");
        hooks.beforeConsume?.();
        const target = invitationTable.find((item) =>
          item.id === where.id && item.consumedAt === null && item.expiresAt.getTime() > where.expiresAt.$gt.getTime());
        if (!target) return 0;
        target.consumedAt = data.consumedAt;
        return 1;
      }),
      refresh: vi.fn(async (record: InvitationRow) => record),
      create: vi.fn((entity: unknown, data: RoleRow) => {
        expect(entity).toBe(UserRole);
        return { ...data };
      }),
      persist: vi.fn((item: RoleRow) => {
        events.push(`grant ${item.role}`);
        pendingRoles.push(item);
      }),
    };
  }

  const outer = ops(false);
  const tx = ops(true);
  const em = {
    ...outer,
    transactional: vi.fn(async (callback: (em: unknown) => Promise<unknown>, options: unknown) => {
      expect(options).toEqual({ clear: true });
      events.push("begin");
      const savedInvitations = invitationTable.map((item) => [item, { ...item }] as const);
      pendingRoles = [];
      try {
        const result = await callback(tx);
        for (const item of pendingRoles) {
          if (roleTable.some((held) => held.user.id === idOf(item.user) && held.role === item.role)) throw new Error("duplicate role");
          if (item.invitation && item.role !== "mentor") throw new Error("user_roles_invitation_mentor_check");
          roleTable.push(item);
        }
        events.push("commit");
        return result;
      } catch (error) {
        for (const [item, copy] of savedInvitations) Object.assign(item, copy);
        pendingRoles = [];
        events.push("rollback");
        throw error;
      }
    }),
  };

  const typed = em as unknown as EntityManager;
  const roleService = new RoleService({ em: typed });
  const userService = new UserService({ em: typed, roleService });
  const emailSender = new MemoryEmailSender();
  const service = new MentorInvitationService({
    em: typed,
    clock: fixedClock(NOW),
    config: createAppConfig({ APP_URL: "https://devmentor.test" }),
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    emailSender,
    roleService,
    userService,
  });
  return { service, events, em, tx, hooks, userTable, roleTable, invitationTable, emailSender };
}

async function failure(promise: Promise<unknown>): Promise<AppError> {
  try {
    await promise;
  } catch (error) {
    if (isAppError(error)) return error;
    throw error;
  }
  throw new Error("expected a refusal");
}

/** Tokens that can no longer be accepted: unknown, malformed, tampered, rotated by resend, used, expired, revoked. */
const UNUSABLE: [string, { token?: string; invitation?: Partial<InvitationRow> }][] = [
  ["unknown", { token: generateToken() }],
  ["malformed", { token: "not-a-token" }],
  ["tampered", { token: `${TOKEN.slice(0, -1)}${TOKEN.endsWith("A") ? "B" : "A"}` }],
  ["rotated by resend", { invitation: { tokenHash: hashToken(generateToken()) } }],
  ["used", { invitation: { consumedAt: new Date(NOW.getTime() - 1000), acceptedBy: userRow({ id: "u-9", email: "x@example.com" }) } }],
  ["expired (exactly now)", { invitation: { expiresAt: NOW } }],
  ["expired", { invitation: { expiresAt: new Date(NOW.getTime() - 1) } }],
  ["revoked", { invitation: { revokedAt: new Date(NOW.getTime() - 1000) } }],
  ["revoked, even before its expiry", { invitation: { revokedAt: NOW, expiresAt: LATER } }],
];

describe("MentorInvitationService.inspect (GET /invite/[token])", () => {
  it.each(UNUSABLE)("shows one invalid state for a %s token, signed in or out", async (_case, { token = TOKEN, invitation }) => {
    for (const principal of [null, principalOf(userRow())]) {
      const t = setup({ invitations: [invitationRow(invitation)] });
      const before = structuredClone(t.invitationTable);
      await expect(t.service.inspect(token, principal)).resolves.toEqual({ status: "invalid" });
      expect(t.invitationTable).toEqual(before);
      expect(t.events).toEqual([]);
    }
  });

  it("never queries for a malformed token", async () => {
    const t = setup();
    await t.service.inspect("../../etc", null);
    expect(t.em.findOne).not.toHaveBeenCalled();
  });

  it("asks a signed-out visitor to sign in, without reading any account", async () => {
    const t = setup();
    await expect(t.service.inspect(TOKEN, null)).resolves.toEqual({ status: "signed-out" });
    expect(t.em.findOne).toHaveBeenCalledTimes(1);
    expect(t.em.count).not.toHaveBeenCalled();
  });

  it("treats a session whose account is gone as signed out", async () => {
    const t = setup();
    await expect(t.service.inspect(TOKEN, principalOf(userRow({ id: "u-gone" })))).resolves.toEqual({ status: "signed-out" });
  });

  it.each([
    ["another verified address", userRow({ email: "ada@work.example" })],
    ["the invited address, unverified", userRow({ emailConfirmedAt: null })],
    ["another address, unverified", userRow({ email: "ada@work.example", emailConfirmedAt: null })],
  ])("shows a mismatch to %s with only the current account's email", async (_case, user) => {
    const t = setup({ users: [user] });
    const state = await t.service.inspect(TOKEN, principalOf(user));
    expect(state).toEqual({ status: "mismatch", currentEmail: user.email });
    if (user.email !== EMAIL) expect(JSON.stringify(state)).not.toContain(EMAIL);
  });

  it("tells a matching mentor there is nothing to accept, leaving the invitation open", async () => {
    const t = setup({ roles: ["mentee", "mentor"] });
    await expect(t.service.inspect(TOKEN, principalOf(userRow()))).resolves.toEqual({ status: "already-mentor" });
    expect(t.invitationTable[0]).toMatchObject({ consumedAt: null, acceptedBy: null });
  });

  it("names the matching verified account that will receive mentor, and changes nothing (no consume, no lock)", async () => {
    const t = setup({ roles: ["mentee", "operator"] });
    const before = structuredClone(t.invitationTable);
    await expect(t.service.inspect(TOKEN, principalOf(userRow()))).resolves.toEqual({
      status: "valid", displayName: "Ada Nowak", email: EMAIL,
    });
    expect(t.invitationTable).toEqual(before);
    expect(t.roleTable.map((item) => item.role)).toEqual(["mentee", "operator"]);
    expect(t.events).toEqual([]);
    expect(t.em.nativeUpdate).not.toHaveBeenCalled();
  });
});

describe("MentorInvitationService.accept (POST /api/auth/invitations/accept)", () => {
  it("locks the user, then the invitation, consumes it and adds mentor, keeping every existing role", async () => {
    const t = setup({ roles: ["mentee", "operator"] });
    const account = await t.service.accept(TOKEN, principalOf(userRow()));

    expect(t.events).toEqual(["begin", "lock user", "lock invitation", "consume", "grant mentor", "commit"]);
    expect(account).toEqual({
      id: "u-1", email: EMAIL, displayName: "Ada Nowak", roles: ["mentee", "mentor", "operator"],
      signInMethods: { github: true, password: false },
    });
    const [invitation] = t.invitationTable;
    expect(invitation).toMatchObject({ consumedAt: NOW, revokedAt: null, acceptedBy: t.userTable[0] });
    expect(t.roleTable.find((item) => item.role === "mentor")).toEqual({ user: t.userTable[0], role: "mentor", invitation });
    expect(t.roleTable.filter((item) => item.role !== "mentor").every((item) => item.invitation === null)).toBe(true);
    // Never emails, and never touches sessions (the em fails any other entity).
    expect(t.emailSender.sent).toEqual([]);
  });

  it("cannot grant again when the link is reopened", async () => {
    const t = setup();
    await t.service.accept(TOKEN, principalOf(userRow()));
    const error = await failure(t.service.accept(TOKEN, principalOf(userRow())));
    expect([error.status, error.code, error.message]).toEqual([404, "not_found", "This invitation is not valid"]);
    expect(t.roleTable.filter((item) => item.role === "mentor")).toHaveLength(1);
  });

  it.each([
    ["another verified address", userRow({ email: "ada@work.example" })],
    ["the invited address, unverified", userRow({ emailConfirmedAt: null })],
  ])("refuses %s with 403, consuming nothing, so the real invitee can still accept", async (_case, user) => {
    const t = setup({ users: [user, userRow({ id: "u-2" })] });
    const error = await failure(t.service.accept(TOKEN, principalOf(user)));
    expect([error.status, error.code, error.message]).toEqual([403, "forbidden", INVITATION_EMAIL_MISMATCH_MESSAGE]);
    expect(error.message).not.toContain(EMAIL);
    expect(t.events).toEqual(["begin", "lock user", "lock invitation", "rollback"]);
    expect(t.invitationTable[0]).toMatchObject({ consumedAt: null, acceptedBy: null });
    expect(t.roleTable.map((item) => item.role)).toEqual(["mentee"]);

    await expect(t.service.accept(TOKEN, principalOf(userRow({ id: "u-2" })))).resolves.toMatchObject({ id: "u-2", roles: ["mentor"] });
  });

  it("answers an existing mentor 409 and leaves the invitation unconsumed", async () => {
    const t = setup({ roles: ["mentee", "mentor"] });
    const error = await failure(t.service.accept(TOKEN, principalOf(userRow())));
    expect([error.status, error.code, error.message]).toEqual([409, "conflict", ALREADY_MENTOR_MESSAGE]);
    expect(t.events).toEqual(["begin", "lock user", "lock invitation", "rollback"]);
    expect(t.invitationTable[0]).toMatchObject({ consumedAt: null, acceptedBy: null });
    expect(t.roleTable.map((item) => item.role)).toEqual(["mentee", "mentor"]);
  });

  it.each(UNUSABLE)("answers a %s token 404 and changes nothing", async (_case, { token = TOKEN, invitation }) => {
    const t = setup({ invitations: [invitationRow(invitation)] });
    const before = structuredClone(t.invitationTable);
    const error = await failure(t.service.accept(token, principalOf(userRow())));
    expect([error.status, error.code, error.message]).toEqual([404, "not_found", "This invitation is not valid"]);
    expect(t.events.at(-1)).toBe("rollback");
    expect(t.events).not.toContain("consume");
    expect(t.invitationTable).toEqual(before);
    expect(t.roleTable.map((item) => item.role)).toEqual(["mentee"]);
  });

  it("does not even look a malformed token up, but still locks the user first", async () => {
    const t = setup();
    await failure(t.service.accept("short", principalOf(userRow())));
    expect(t.events).toEqual(["begin", "lock user", "rollback"]);
    expect(t.tx.findOne).toHaveBeenCalledTimes(1);
  });

  it("checks the token before the address: an unusable link is 404 even for a mismatching account", async () => {
    const other = userRow({ email: "ada@work.example" });
    const t = setup({ users: [other], invitations: [invitationRow({ revokedAt: NOW })] });
    expect((await failure(t.service.accept(TOKEN, principalOf(other)))).status).toBe(404);
  });

  it("answers 404 without a grant when the consume finds the link already used", async () => {
    const t = setup();
    t.hooks.beforeConsume = () => { t.invitationTable[0]!.consumedAt = new Date(NOW.getTime() - 1); };
    const error = await failure(t.service.accept(TOKEN, principalOf(userRow())));
    expect(error.status).toBe(404);
    expect(t.events).toEqual(["begin", "lock user", "lock invitation", "consume", "rollback"]);
    expect(t.roleTable.map((item) => item.role)).toEqual(["mentee"]);
  });

  it("answers 401 when the session's account is gone", async () => {
    const t = setup();
    const error = await failure(t.service.accept(TOKEN, principalOf(userRow({ id: "u-gone" }))));
    expect(error.status).toBe(401);
    expect(t.events).toEqual(["begin", "lock user", "rollback"]);
  });
});
