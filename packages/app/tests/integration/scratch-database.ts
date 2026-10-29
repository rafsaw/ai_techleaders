import { randomUUID } from "node:crypto";

import { createAppContainer, type AppContainer } from "@devmentor/core";
import pg from "pg";
import { afterAll, beforeAll, inject, vi } from "vitest";

import { runNpm } from "./npm";

/**
 * A database of its own inside the integration PostgreSQL container, for
 * scenarios that would disturb the app's database (migration `down()`, the
 * limiter's table-wide expiry cleanup under a fixed clock). It runs on the
 * exact same server version, costs no second container start, and disappears
 * with the container even if the `DROP DATABASE` in `afterAll` never runs.
 *
 * Call it inside a `describe`: it registers that block's `beforeAll` (create +
 * connect) and `afterAll` (disconnect + drop).
 */
export function useScratchDatabase(prefix: string) {
  const adminURL = inject("databaseURL");
  const database = `${prefix}_${randomUUID().replaceAll("-", "")}`;
  const url = Object.assign(new URL(adminURL), { pathname: `/${database}` }).toString();
  let client: pg.Client | undefined;

  async function withAdmin(text: string): Promise<void> {
    const admin = new pg.Client({ connectionString: adminURL });
    await admin.connect();
    try {
      await admin.query(text);
    } finally {
      await admin.end();
    }
  }

  beforeAll(async () => {
    await withAdmin(`create database "${database}"`);
    client = new pg.Client({ connectionString: url });
    await client.connect();
  });

  afterAll(async () => {
    await client?.end();
    await withAdmin(`drop database if exists "${database}" with (force)`);
  });

  return {
    url,
    async query<T extends pg.QueryResultRow>(text: string, values: unknown[] = []): Promise<T[]> {
      return (await client!.query<T>(text, values)).rows;
    },
    /** `npm run db:migrate[:down] -- <flags>`: the repo's own commands, against this database only. */
    async migrate(direction: "up" | "down", flags: string[], logPath: string): Promise<void> {
      await runNpm([direction === "up" ? "db:migrate" : "db:migrate:down", "--", "--", ...flags], url, logPath);
    },
  };
}

/**
 * A container with `@devmentor/db` registered against `databaseURL`. The db
 * config reads `DATABASE_URL` when its module is first evaluated, so the
 * variable is stubbed around that (dynamic) import only. Dispose the container
 * to close the pool.
 */
export async function dbContainer(databaseURL: string): Promise<{ container: AppContainer; db: typeof import("@devmentor/db") }> {
  vi.stubEnv("DATABASE_URL", databaseURL);
  vi.stubEnv("DB_DEBUG", "false");
  try {
    const db = await import("@devmentor/db");
    const container = createAppContainer();
    db.registerDb(container);
    return { container, db };
  } finally {
    vi.unstubAllEnvs();
  }
}
