import type { EntityManager } from "@mikro-orm/core";
import { Seeder } from "@mikro-orm/seeder";
import { describe, expect, it, vi } from "vitest";

import { User } from "../entities/auth/user.entity";
import { DatabaseSeeder, SAMPLE_USER } from "./database.seeder";

function entityManager(existing: unknown) {
  const em = { findOne: vi.fn(async () => existing), create: vi.fn() };
  return { em, run: () => new DatabaseSeeder().run(em as unknown as EntityManager) };
}

describe("DatabaseSeeder", () => {
  it("is a MikroORM seeder for the sample user", () => {
    expect(new DatabaseSeeder()).toBeInstanceOf(Seeder);
    expect(SAMPLE_USER).toEqual({ email: "ada@devmentor.dev", name: "Ada Lovelace" });
  });

  it("creates the sample user when no user has its email", async () => {
    const { em, run } = entityManager(null);
    await run();
    expect(em.findOne).toHaveBeenCalledExactlyOnceWith(User, { email: "ada@devmentor.dev" });
    expect(em.create).toHaveBeenCalledExactlyOnceWith(User, { email: "ada@devmentor.dev", name: "Ada Lovelace" });
  });

  it("leaves an existing user untouched on a re-run", async () => {
    const existing = { email: "ada@devmentor.dev", name: "Edited locally" };
    const { em, run } = entityManager(existing);
    await run();
    expect(em.findOne).toHaveBeenCalledOnce();
    expect(em.create).not.toHaveBeenCalled();
    expect(existing).toEqual({ email: "ada@devmentor.dev", name: "Edited locally" });
  });

  it("propagates database errors instead of swallowing them", async () => {
    const em = { findOne: vi.fn(async () => { throw new Error('relation "users" does not exist'); }), create: vi.fn() };
    await expect(new DatabaseSeeder().run(em as unknown as EntityManager)).rejects.toThrow('relation "users" does not exist');
    expect(em.create).not.toHaveBeenCalled();
  });
});
