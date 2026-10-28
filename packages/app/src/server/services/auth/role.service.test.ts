import { ValidationError } from "@devmentor/core";
import { UserRole, type EntityManager } from "@devmentor/db";
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
    const error = await service.grant("u-1", "mentor" as never).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error).toMatchObject({ fieldErrors: { role: ["The mentor role is granted only by accepting an invitation"] } });
    expect(em.count).not.toHaveBeenCalled();
    expect(em.upsert).not.toHaveBeenCalled();
  });

  it("revokes only the operator role, idempotently", async () => {
    const { em, service } = setup({ deleted: 1 });
    await expect(service.revokeOperator("u-1")).resolves.toBe(true);
    expect(em.nativeDelete).toHaveBeenCalledWith(UserRole, { user: "u-1", role: "operator" });
    em.nativeDelete.mockResolvedValueOnce(0);
    await expect(service.revokeOperator("u-1")).resolves.toBe(false);
  });
});
