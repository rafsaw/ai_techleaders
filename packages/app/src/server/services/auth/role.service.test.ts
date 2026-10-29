import { ValidationError } from "@devmentor/core";
import { UserRole, type EntityManager, type MentorInvitation, type User } from "@devmentor/db";
import { describe, expect, it, vi } from "vitest";

import { RoleService, sortRoles } from "@/server/services/auth/role.service";

function setup({ count = 0, rows = [] as { role: string }[], deleted = 0 } = {}) {
  const em = {
    find: vi.fn().mockResolvedValue(rows),
    count: vi.fn().mockResolvedValue(count),
    upsert: vi.fn().mockResolvedValue({}),
    nativeDelete: vi.fn().mockResolvedValue(deleted),
  };
  return { em, service: new RoleService({ em: em as unknown as EntityManager }) };
}

describe("sortRoles", () => {
  it("orders roles canonically and drops duplicates", () => {
    expect(sortRoles(["operator", "mentee", "mentor", "mentee"])).toEqual(["mentee", "mentor", "operator"]);
    expect(sortRoles([])).toEqual([]);
  });
});

describe("RoleService", () => {
  it("reads a user's current roles in canonical order", async () => {
    const { em, service } = setup({ rows: [{ role: "operator" }, { role: "mentee" }] });
    await expect(service.rolesOf("u-1")).resolves.toEqual(["mentee", "operator"]);
    expect(em.find).toHaveBeenCalledWith(UserRole, { user: "u-1" });
  });

  it.each(["mentee", "operator"] as const)("grants %s idempotently through the unique (user, role) constraint", async (role) => {
    const { em, service } = setup();
    await expect(service.grant("u-1", role)).resolves.toBe(true);
    expect(em.count).toHaveBeenCalledWith(UserRole, { user: "u-1", role });
    expect(em.upsert).toHaveBeenCalledWith(UserRole, { user: "u-1", role },
      { onConflictFields: ["user", "role"], onConflictAction: "ignore" });
  });

  it("reports an already-held role as unchanged without writing", async () => {
    const { em, service } = setup({ count: 1 });
    await expect(service.grant("u-1", "operator")).resolves.toBe(false);
    expect(em.upsert).not.toHaveBeenCalled();
  });

  it("refuses mentor: it comes only from accepting an invitation", async () => {
    const { em, service } = setup();
    // Compile time: GrantableRole excludes mentor, so a typed caller cannot even ask.
    // @ts-expect-error mentor is not a GrantableRole
    const error = await service.grant("u-1", "mentor").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error).toMatchObject({ fieldErrors: { role: ["The mentor role is granted only by accepting an invitation"] } });
    expect(em.count).not.toHaveBeenCalled();
    expect(em.upsert).not.toHaveBeenCalled();
  });

  it("accepts mentee and operator only, at compile time", () => {
    type GrantRole = Parameters<RoleService["grant"]>[1];
    const allowed: GrantRole[] = ["mentee", "operator"];
    // @ts-expect-error mentor is not a GrantableRole
    const refused: GrantRole = "mentor";
    expect(allowed).toHaveLength(2);
    expect(refused).toBe("mentor");
  });

  it("revokes only the operator role, idempotently", async () => {
    const { em, service } = setup({ deleted: 1 });
    await expect(service.revokeOperator("u-1")).resolves.toBe(true);
    expect(em.nativeDelete).toHaveBeenCalledWith(UserRole, { user: "u-1", role: "operator" });
    em.nativeDelete.mockResolvedValueOnce(0);
    await expect(service.revokeOperator("u-1")).resolves.toBe(false);
  });
});

describe("RoleService.grantMentorFromInvitation", () => {
  const NOW = new Date("2026-10-28T12:00:00.000Z");
  const user = { id: "u-1", email: "ada@example.com", emailConfirmedAt: NOW } as User;
  const accepted = () =>
    ({ id: "inv-1", email: "ada@example.com", consumedAt: NOW, revokedAt: null, acceptedBy: user }) as unknown as MentorInvitation;

  function tx(inTransaction = true) {
    const em = {
      isInTransaction: vi.fn(() => inTransaction),
      create: vi.fn((_entity: unknown, data: object) => ({ ...data })),
      persist: vi.fn(),
    };
    return { em, typed: em as unknown as EntityManager };
  }

  it("adds one mentor row recording the invitation, inside the acceptance transaction", () => {
    const { service } = setup();
    const { em, typed } = tx();
    const invitation = accepted();
    service.grantMentorFromInvitation(typed, { user, invitation });
    expect(em.create).toHaveBeenCalledWith(UserRole, { user, role: "mentor", invitation });
    expect(em.persist).toHaveBeenCalledWith({ user, role: "mentor", invitation });
  });

  it("refuses outside a transaction", () => {
    const { service } = setup();
    const { em, typed } = tx(false);
    expect(() => service.grantMentorFromInvitation(typed, { user, invitation: accepted() }))
      .toThrow("The mentor role is granted only inside the invitation acceptance transaction");
    expect(em.persist).not.toHaveBeenCalled();
  });

  it.each([
    ["not consumed", { consumedAt: null }, {}],
    ["revoked", { revokedAt: NOW }, {}],
    ["accepted by nobody", { acceptedBy: null }, {}],
    ["accepted by another account", { acceptedBy: { id: "u-2" } }, {}],
    ["bound to another address", { email: "bob@example.com" }, {}],
    ["for an unverified account", {}, { emailConfirmedAt: null }],
  ])("refuses an invitation %s", (_case, invitationChanges, userChanges) => {
    const { service } = setup();
    const { em, typed } = tx();
    const who = { ...user, ...userChanges } as User;
    const invitation = { ...accepted(), acceptedBy: who, ...invitationChanges } as unknown as MentorInvitation;
    expect(() => service.grantMentorFromInvitation(typed, { user: who, invitation }))
      .toThrow("The mentor role is granted only from an invitation this verified account accepted");
    expect(em.persist).not.toHaveBeenCalled();
  });
});
