import type { EntityManager } from "@mikro-orm/core";
import { Seeder } from "@mikro-orm/seeder";

import { User } from "../entities/auth/user.entity";

export const SAMPLE_USER = { email: "ada@devmentor.dev", name: "Ada Lovelace" } as const;

/**
 * Default seeder for `npm run db:seed`: gives a fresh local database one user
 * to show on /backend/users. Idempotent — an existing row with the sample
 * email is left untouched, so re-running never duplicates or overwrites it.
 * SeedManager flushes after `run()`.
 */
export class DatabaseSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const existing = await em.findOne(User, { email: SAMPLE_USER.email });
    if (!existing) em.create(User, { ...SAMPLE_USER });
  }
}
