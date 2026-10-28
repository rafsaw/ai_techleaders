import { randomUUID } from "node:crypto";
import { join } from "node:path";

import pg from "pg";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";

import { runNpm } from "./npm";

/**
 * Round trip of the accounts Phase 1 migration (E01 step 1.5) through the real
 * MikroORM CLI: baseline only -> Phase 1 up -> Phase 1 down -> Phase 1 up.
 *
 * It runs in its own database inside the integration PostgreSQL container, not
 * in the app's database: `down()` drops tables the running app and the other
 * scenarios need, while a sibling database is fully isolated (its own schema
 * and `mikro_orm_migrations` table), runs on the exact same server version,
 * costs no second container start, and disappears with the container even if
 * the `DROP DATABASE` below never runs.
 *
 * Every step names its migration (`--to` / `--only`), so later migrations are
 * never applied here and this file keeps testing exactly this pair. A future
 * migration gets its own round trip in the same style.
 */
const BASELINE = "Migration20261013225312";
const ACCOUNTS = "Migration20261028002328";

const PRE_EXISTING_USERS = [
  { id: randomUUID(), email: "grace@example.com", name: "Grace Hopper", createdAt: "2026-01-02 03:04:05.123456+00" },
  { id: randomUUID(), email: "linus@example.com", name: "Linus Torvalds", createdAt: "2026-02-03 04:05:06.654321+00" },
  { id: randomUUID(), email: "margaret@example.com", name: "Margaret Hamilton", createdAt: "2026-03-04 05:06:07+00" },
];

describe("accounts migration round trip on PostgreSQL (E01 Phase 1)", () => {
  const adminURL = inject("databaseURL");
  const logPath = join(inject("integrationArtifactsDirectory"), "migrations-round-trip.log");
  const database = `migrations_${randomUUID().replaceAll("-", "")}`;
  const databaseURL = Object.assign(new URL(adminURL), { pathname: `/${database}` }).toString();
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

  async function query<T extends pg.QueryResultRow>(text: string, values: unknown[] = []): Promise<T[]> {
    return (await client!.query<T>(text, values)).rows;
  }

  /** `npm run db:migrate[:down] -- <flags>`: the repo's own commands, against this database only. */
  async function migrate(direction: "up" | "down", flags: string[]): Promise<void> {
    await runNpm([direction === "up" ? "db:migrate" : "db:migrate:down", "--", "--", ...flags], databaseURL, logPath);
  }

  async function executedMigrations(): Promise<string[]> {
    const rows = await query<{ name: string }>(`select name from mikro_orm_migrations order by id`);
    return rows.map(({ name }) => name.replace(/\.[jt]s$/, ""));
  }

  async function tables(): Promise<string[]> {
    const rows = await query<{ table_name: string }>(
      `select table_name from information_schema.tables where table_schema = 'public' and table_name <> 'mikro_orm_migrations' order by table_name`);
    return rows.map(({ table_name }) => table_name);
  }

  async function columns(table: string) {
    return query<{ column_name: string; data_type: string; character_maximum_length: number | null; is_nullable: string }>(
      `select column_name, data_type, character_maximum_length, is_nullable from information_schema.columns
        where table_schema = 'public' and table_name = $1 order by ordinal_position`, [table]);
  }

  async function constraints(table: string) {
    return query<{ name: string; definition: string }>(
      `select conname as name, pg_get_constraintdef(oid) as definition from pg_constraint
        where conrelid = $1::regclass order by conname`, [table]);
  }

  /** Exact user rows; timestamps as text so microseconds are compared too. */
  async function users() {
    return query<{ id: string; email: string; name: string; created_at: string; updated_at: string }>(
      `select id, email, name, created_at::text, updated_at::text from users order by email`);
  }

  async function rolesByUser(): Promise<Record<string, string[]>> {
    const rows = await query<{ user_id: string; roles: string[] }>(
      `select user_id, array_agg(role order by role) as roles from user_roles group by user_id`);
    return Object.fromEntries(rows.map(({ user_id, roles }) => [user_id, roles]));
  }

  let baselineUsers: Awaited<ReturnType<typeof users>>;
  let baselineUserColumns: Awaited<ReturnType<typeof columns>>;
  let baselineUserConstraints: Awaited<ReturnType<typeof constraints>>;

  beforeAll(async () => {
    await withAdmin(`create database "${database}"`);
    client = new pg.Client({ connectionString: databaseURL });
    await client.connect();
  });

  afterAll(async () => {
    await client?.end();
    await withAdmin(`drop database if exists "${database}" with (force)`);
  });

  it("applies only the baseline migration and keeps pre-existing users", async () => {
    await migrate("up", ["--to", BASELINE]);

    expect(await executedMigrations()).toEqual([BASELINE]);
    expect(await tables()).toEqual(["users"]);
    for (const user of PRE_EXISTING_USERS) {
      await query(`insert into users (id, created_at, updated_at, email, name) values ($1, $2, $2, $3, $4)`,
        [user.id, user.createdAt, user.email, user.name]);
    }
    baselineUsers = await users();
    baselineUserColumns = await columns("users");
    baselineUserConstraints = await constraints("users");
    expect(baselineUsers).toHaveLength(PRE_EXISTING_USERS.length);
    expect(baselineUserColumns.map(({ column_name }) => column_name)).toEqual(["id", "created_at", "updated_at", "email", "name"]);
  });

  it("migrates up to Phase 1 with the new tables, columns, constraints and index", async () => {
    await migrate("up", ["--to", ACCOUNTS]);

    expect(await executedMigrations()).toEqual([BASELINE, ACCOUNTS]);
    expect(await tables()).toEqual(["auth_sessions", "user_roles", "users"]);
    expect(await columns("users")).toEqual([
      ...baselineUserColumns,
      { column_name: "github_id", data_type: "character varying", character_maximum_length: 32, is_nullable: "YES" },
      { column_name: "email_confirmed_at", data_type: "timestamp with time zone", character_maximum_length: null, is_nullable: "YES" },
    ]);
    const timestamps = [
      { column_name: "created_at", data_type: "timestamp with time zone", character_maximum_length: null, is_nullable: "NO" },
      { column_name: "updated_at", data_type: "timestamp with time zone", character_maximum_length: null, is_nullable: "NO" },
    ];
    const id = { column_name: "id", data_type: "uuid", character_maximum_length: null, is_nullable: "NO" };
    const userId = { column_name: "user_id", data_type: "uuid", character_maximum_length: null, is_nullable: "NO" };
    expect(await columns("user_roles")).toEqual([
      id, ...timestamps, userId,
      { column_name: "role", data_type: "text", character_maximum_length: null, is_nullable: "NO" },
    ]);
    expect(await columns("auth_sessions")).toEqual([
      id, ...timestamps, userId,
      { column_name: "token_hash", data_type: "character", character_maximum_length: 64, is_nullable: "NO" },
      { column_name: "expires_at", data_type: "timestamp with time zone", character_maximum_length: null, is_nullable: "NO" },
    ]);

    expect(await constraints("users")).toEqual([
      ...baselineUserConstraints,
      { name: "users_github_id_unique", definition: "UNIQUE (github_id)" },
    ].sort((a, b) => a.name.localeCompare(b.name)));
    expect(await constraints("user_roles")).toEqual([
      { name: "user_roles_pkey", definition: "PRIMARY KEY (id)" },
      { name: "user_roles_role_check", definition: "CHECK ((role = ANY (ARRAY['mentee'::text, 'mentor'::text, 'operator'::text])))" },
      { name: "user_roles_user_id_foreign", definition: "FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE" },
      { name: "user_roles_user_id_role_unique", definition: "UNIQUE (user_id, role)" },
    ]);
    expect(await constraints("auth_sessions")).toEqual([
      { name: "auth_sessions_pkey", definition: "PRIMARY KEY (id)" },
      { name: "auth_sessions_token_hash_unique", definition: "UNIQUE (token_hash)" },
      { name: "auth_sessions_user_id_foreign", definition: "FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE" },
    ]);
    expect(await query(`select indexdef from pg_indexes where schemaname = 'public' and indexname = 'auth_sessions_user_id_index'`))
      .toEqual([{ indexdef: "CREATE INDEX auth_sessions_user_id_index ON public.auth_sessions USING btree (user_id)" }]);
  });

  it("backfills exactly one mentee role per pre-existing user and leaves the user rows unchanged", async () => {
    expect(await rolesByUser()).toEqual(Object.fromEntries(PRE_EXISTING_USERS.map(({ id }) => [id, ["mentee"]])));
    expect(await users()).toEqual(baselineUsers);
    expect(await query(`select count(*)::int as unset from users where github_id is null and email_confirmed_at is null`))
      .toEqual([{ unset: PRE_EXISTING_USERS.length }]);
  });

  it("enforces the Phase 1 constraints", async () => {
    const [grace, linus] = PRE_EXISTING_USERS;
    await expect(query(`insert into user_roles values (gen_random_uuid(), now(), now(), $1, 'mentee')`, [grace!.id]))
      .rejects.toMatchObject({ code: "23505", constraint: "user_roles_user_id_role_unique" });
    await expect(query(`insert into user_roles values (gen_random_uuid(), now(), now(), $1, 'admin')`, [grace!.id]))
      .rejects.toMatchObject({ code: "23514", constraint: "user_roles_role_check" });
    await expect(query(`insert into user_roles values (gen_random_uuid(), now(), now(), $1, 'mentor')`, [randomUUID()]))
      .rejects.toMatchObject({ code: "23503", constraint: "user_roles_user_id_foreign" });

    const tokenHash = "a".repeat(64);
    await query(`insert into auth_sessions values (gen_random_uuid(), now(), now(), $1, $2, now() + interval '30 days')`, [grace!.id, tokenHash]);
    await expect(query(`insert into auth_sessions values (gen_random_uuid(), now(), now(), $1, $2, now() + interval '30 days')`, [linus!.id, tokenHash]))
      .rejects.toMatchObject({ code: "23505", constraint: "auth_sessions_token_hash_unique" });

    await query(`update users set github_id = '1001' where id = $1`, [grace!.id]);
    await expect(query(`update users set github_id = '1001' where id = $1`, [linus!.id]))
      .rejects.toMatchObject({ code: "23505", constraint: "users_github_id_unique" });

    // Deleting a user cascades to its roles and sessions.
    const doomed = randomUUID();
    await query(`insert into users (id, created_at, updated_at, email, name) values ($1, now(), now(), 'doomed@example.com', 'Doomed')`, [doomed]);
    await query(`insert into user_roles values (gen_random_uuid(), now(), now(), $1, 'mentee'), (gen_random_uuid(), now(), now(), $1, 'operator')`, [doomed]);
    await query(`insert into auth_sessions values (gen_random_uuid(), now(), now(), $1, $2, now() + interval '30 days')`, [doomed, "b".repeat(64)]);
    await query(`delete from users where id = $1`, [doomed]);
    expect(await query(`select count(*)::int as left from user_roles where user_id = $1`, [doomed])).toEqual([{ left: 0 }]);
    expect(await query(`select count(*)::int as left from auth_sessions where user_id = $1`, [doomed])).toEqual([{ left: 0 }]);
  });

  it("reverts Phase 1 with down() and preserves the original users and their columns", async () => {
    // Phase 1 data that down() drops (disposable environments only; the
    // production rollback is code-only and keeps this schema, spec Risks).
    const [grace, linus] = PRE_EXISTING_USERS;
    await query(`update users set email_confirmed_at = now() where id = $1`, [grace!.id]);
    await query(`insert into user_roles values (gen_random_uuid(), now(), now(), $1, 'mentor')`, [linus!.id]);

    await migrate("down", ["--only", ACCOUNTS]);

    expect(await executedMigrations()).toEqual([BASELINE]);
    expect(await tables()).toEqual(["users"]);
    expect(await columns("users")).toEqual(baselineUserColumns);
    expect(await constraints("users")).toEqual(baselineUserConstraints);
    expect(await users()).toEqual(baselineUsers);
  });

  it("migrates up again after down() and re-runs the mentee backfill", async () => {
    await migrate("up", ["--to", ACCOUNTS]);

    expect(await executedMigrations()).toEqual([BASELINE, ACCOUNTS]);
    expect(await tables()).toEqual(["auth_sessions", "user_roles", "users"]);
    expect(await rolesByUser()).toEqual(Object.fromEntries(PRE_EXISTING_USERS.map(({ id }) => [id, ["mentee"]])));
    expect(await query(`select count(*)::int as sessions from auth_sessions`)).toEqual([{ sessions: 0 }]);
    expect(await users()).toEqual(baselineUsers);
    expect(await query(`select count(*)::int as unset from users where github_id is null and email_confirmed_at is null`))
      .toEqual([{ unset: PRE_EXISTING_USERS.length }]);
  });
});
