import { Migrator } from "@mikro-orm/migrations";
import { defineConfig } from "@mikro-orm/postgresql";
import { SeedManager } from "@mikro-orm/seeder";

import { entities } from "./entities";
import { DatabaseSeeder } from "./seeders/database.seeder";

function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number.parseInt(raw, 10);
  if (Number.isNaN(value)) throw new Error(`${name} must be an integer, got "${raw}"`);
  return value;
}

export default defineConfig({
  clientUrl: process.env.DATABASE_URL,
  entities,
  extensions: [Migrator, SeedManager],
  pool: {
    min: intFromEnv("DB_POOL_MIN", 0),
    max: intFromEnv("DB_POOL_MAX", 10),
  },
  migrations: {
    // Relative to the working directory; the CLI always runs from packages/db.
    path: "src/migrations",
    snapshot: false,
    transactional: true,
    allOrNothing: true,
  },
  seeder: {
    // Explicit list, like `entities`: without it `seeder:run` imports every
    // file in the seeders folder, test files included.
    seedersList: [DatabaseSeeder],
    defaultSeeder: DatabaseSeeder.name,
  },
  debug: process.env.DB_DEBUG === "true",
});
