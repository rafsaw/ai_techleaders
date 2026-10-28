import type { EntityManager } from "@mikro-orm/core";
import { Seeder } from "@mikro-orm/seeder";
import { describe, expect, it, vi } from "vitest";

import { User } from "../entities/auth/user.entity";
import { UserRole } from "../entities/auth/user-role.entity";
import { DatabaseSeeder, SAMPLE_USER } from "./database.seeder";

function entityManager(existingUser: unknown, existingRole: unknown = null) {
  const created = { id: "new-user" };
  const em = {
    findOne: vi.fn(async (entity: unknown) => (entity === User ? existingUser : existingRole)),
    create: vi.fn((entity: unknown) => (entity === User ? created : {})),
  };
  return { em, created, run: () => new DatabaseSeeder().run(em as unknown as EntityManager) };
}

describe("DatabaseSeeder", () => {
  it("is a MikroORM seeder for the sample user", () => {
    expect(new DatabaseSeeder()).toBeInstanceOf(Seeder);
    expect(SAMPLE_USER).toEqual({ email: "ada@devmentor.dev", name: "Ada Lovelace" });
  });

  it("creates the sample user with the mentee role when no user has its email", async () => {
    const { em, created, run } = entityManager(null);
    await run();
    expect(em.findOne).toHaveBeenCalledExactlyOnceWith(User, { email: "ada@devmentor.dev" });
    expect(em.create).toHaveBeenCalledTimes(2);
    expect(em.create).toHaveBeenNthCalledWith(1, User, { email: "ada@devmentor.dev", name: "Ada Lovelace" });
    expect(em.create).toHaveBeenNthCalledWith(2, UserRole, { user: created, role: "mentee" });
  });

  it("leaves an existing user and its mentee role untouched on a re-run", async () => {
    const existing = { email: "ada@devmentor.dev", name: "Edited locally" };
    const { em, run } = entityManager(existing, { role: "mentee" });
    await run();
    expect(em.findOne).toHaveBeenCalledTimes(2);
    expect(em.findOne).toHaveBeenLastCalledWith(UserRole, { user: existing, role: "mentee" });
    expect(em.create).not.toHaveBeenCalled();
    expect(existing).toEqual({ email: "ada@devmentor.dev", name: "Edited locally" });
  });

  it("grants mentee to an existing user that lacks it, without touching the user", async () => {
    const existing = { email: "ada@devmentor.dev", name: "Edited locally" };
    const { em, run } = entityManager(existing, null);
    await run();
    expect(em.create).toHaveBeenCalledExactlyOnceWith(UserRole, { user: existing, role: "mentee" });
    expect(existing).toEqual({ email: "ada@devmentor.dev", name: "Edited locally" });
  });

  it("is idempotent across consecutive runs against the same state", async () => {
    const existing = { email: "ada@devmentor.dev", name: "Ada Lovelace" };
    const { em, run } = entityManager(existing, { role: "mentee" });
    await run();
    await run();
    expect(em.create).not.toHaveBeenCalled();
  });

  it("propagates database errors instead of swallowing them", async () => {
    const em = { findOne: vi.fn(async () => { throw new Error('relation "users" does not exist'); }), create: vi.fn() };
    await expect(new DatabaseSeeder().run(em as unknown as EntityManager)).rejects.toThrow('relation "users" does not exist');
    expect(em.create).not.toHaveBeenCalled();
  });
});
