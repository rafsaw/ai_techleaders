import type { EntityManager } from "@mikro-orm/core";
import { Seeder } from "@mikro-orm/seeder";

import { User } from "../entities/auth/user.entity";
import { UserRole } from "../entities/auth/user-role.entity";

export const SAMPLE_USER = { email: "ada@devmentor.dev", name: "Ada Lovelace" } as const;

/**
 * Default seeder for `npm run db:seed`: gives a fresh local database one user
 * (holding the `mentee` role) to show on /backend/users. Idempotent — an
 * existing row with the sample email is left untouched and only gains
 * `mentee` if it lacks it, so re-running never duplicates or overwrites.
 * SeedManager flushes after `run()`.
 */
export class DatabaseSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const existing = await em.findOne(User, { email: SAMPLE_USER.email });
    if (!existing) {
      const user = em.create(User, { ...SAMPLE_USER });
      em.create(UserRole, { user, role: "mentee" });
      return;
    }
    const mentee = await em.findOne(UserRole, { user: existing, role: "mentee" });
    if (!mentee) em.create(UserRole, { user: existing, role: "mentee" });
  }
}
