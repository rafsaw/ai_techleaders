import { ROLES } from "@devmentor/core/validators/auth/role.schema";
import { EntitySchema } from "@mikro-orm/core";
import type { EntityManager } from "@mikro-orm/postgresql";
import { describe, expect, it, vi } from "vitest";

import { AuthSession, entities, User, UserRole } from "./index";

function meta(entity: typeof User | typeof UserRole | typeof AuthSession) {
  const schema = EntitySchema.REGISTRY.get(entity);
  expect(schema).toBeDefined();
  return schema!.meta;
}

describe("entity definitions", () => {
  it("lists every entity", () => {
    expect(entities).toEqual([User, UserRole, AuthSession]);
  });

  it("registers User with its table, primary key, unique email and nullable GitHub columns", () => {
    const { tableName, properties } = meta(User);
    expect(tableName).toBe("users");
    expect(properties.id?.primary).toBe(true);
    expect(properties.email?.unique).toBe(true);
    expect(properties.githubId).toMatchObject({ unique: true, nullable: true, length: 32 });
    expect(properties.emailConfirmedAt?.nullable).toBe(true);
  });

  it("registers UserRole with a cascading user reference, the role enum and a unique (user, role)", () => {
    const m = meta(UserRole);
    expect(m.tableName).toBe("user_roles");
    expect(m.uniques).toEqual([{ properties: ["user", "role"] }]);
    expect(m.properties.user).toMatchObject({ kind: "m:1", deleteRule: "cascade" });
    expect((m.properties.user!.entity as () => unknown)()).toBe(User);
    expect(m.properties.role).toMatchObject({ enum: true, items: [...ROLES] });
  });

  it("registers AuthSession with an indexed cascading user reference and a unique char(64) token hash", () => {
    const m = meta(AuthSession);
    expect(m.tableName).toBe("auth_sessions");
    expect(m.properties.user).toMatchObject({ kind: "m:1", deleteRule: "cascade", index: true });
    expect((m.properties.user!.entity as () => unknown)()).toBe(User);
    expect(m.properties.tokenHash).toMatchObject({ unique: true, columnType: "char(64)" });
    expect(m.properties.expiresAt?.nullable).toBeFalsy();
  });

  it("creates independent UUIDs and timestamps and refreshes updatedAt", () => {
    vi.useFakeTimers();
    try {
      const initial = new Date("2026-01-01T00:00:00Z");
      vi.setSystemTime(initial);
      const properties = EntitySchema.REGISTRY.get(User)!.meta.properties;
      const id = properties.id!.onCreate!;
      const created = properties.createdAt!.onCreate!;
      const updated = properties.updatedAt!.onCreate!;
      const refresh = properties.updatedAt!.onUpdate!;
      const entity = new User();
      const em = {} as EntityManager;
      const firstId = id(entity, em);
      expect(firstId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      expect(id(entity, em)).not.toBe(firstId);
      expect(created(entity, em)).toEqual(initial);
      expect(updated(entity, em)).toEqual(initial);
      const later = new Date("2026-01-02T00:00:00Z");
      vi.setSystemTime(later);
      expect(refresh(entity, em)).toEqual(later);
    } finally { vi.useRealTimers(); }
  });
});
