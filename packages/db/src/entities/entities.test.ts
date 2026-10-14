import { EntitySchema } from "@mikro-orm/core";
import type { EntityManager } from "@mikro-orm/postgresql";
import { describe, expect, it, vi } from "vitest";

import { entities, User } from "./index";

describe("entity definitions", () => {
  it("registers User with its table, primary key and unique email", () => {
    expect(entities).toEqual([User]);
    const schema = EntitySchema.REGISTRY.get(User);
    expect(schema).toBeDefined();
    expect(schema?.meta.tableName).toBe("users");
    expect(schema?.meta.properties.id?.primary).toBe(true);
    expect(schema?.meta.properties.email?.unique).toBe(true);
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
