import { randomUUID } from "node:crypto";
import { join } from "node:path";

import { describe, expect, inject, it } from "vitest";

import { useScratchDatabase } from "./scratch-database";

/**
 * Round trips of the accounts migrations through the real MikroORM CLI, each in
 * its own scratch database inside the integration PostgreSQL container (see
 * `useScratchDatabase`): `down()` drops tables the running app and the other
 * scenarios need, while a sibling database is fully isolated (its own schema
 * and `mikro_orm_migrations` table).
 *
 * Every step names its migration (`--to` / `--only`), so later migrations are
 * never applied by a block and each one keeps testing exactly its migration.
 * A future migration gets its own round trip in the same style.
 */
const BASELINE = "Migration20261013225312";
const ACCOUNTS = "Migration20261028002328";
const ACCOUNTS_PHASE_2 = "Migration20261028165323";
const ACCOUNTS_PHASE_3 = "Migration20261028212643";

const PRE_EXISTING_USERS = [
  { id: randomUUID(), email: "grace@example.com", name: "Grace Hopper", createdAt: "2026-01-02 03:04:05.123456+00" },
  { id: randomUUID(), email: "linus@example.com", name: "Linus Torvalds", createdAt: "2026-02-03 04:05:06.654321+00" },
  { id: randomUUID(), email: "margaret@example.com", name: "Margaret Hamilton", createdAt: "2026-03-04 05:06:07+00" },
];

/** Schema and data probes over one scratch database. */
function probes(query: ReturnType<typeof useScratchDatabase>["query"]) {
  return {
    async executedMigrations(): Promise<string[]> {
      const rows = await query<{ name: string }>(`select name from mikro_orm_migrations order by id`);
      return rows.map(({ name }) => name.replace(/\.[jt]s$/, ""));
    },
    async tables(): Promise<string[]> {
      const rows = await query<{ table_name: string }>(
        `select table_name from information_schema.tables where table_schema = 'public' and table_name <> 'mikro_orm_migrations' order by table_name`);
      return rows.map(({ table_name }) => table_name);
    },
    columns(table: string) {
      return query<{ column_name: string; data_type: string; character_maximum_length: number | null; is_nullable: string }>(
        `select column_name, data_type, character_maximum_length, is_nullable from information_schema.columns
          where table_schema = 'public' and table_name = $1 order by ordinal_position`, [table]);
    },
    constraints(table: string) {
      return query<{ name: string; definition: string }>(
        `select conname as name, pg_get_constraintdef(oid) as definition from pg_constraint
          where conrelid = $1::regclass order by conname`, [table]);
    },
    /** Non-constraint indexes of a table (primary keys and unique constraints are in `constraints`). */
    async indexes(table: string): Promise<string[]> {
      const rows = await query<{ indexdef: string }>(
        `select indexdef from pg_indexes i where schemaname = 'public' and tablename = $1
            and not exists (select 1 from pg_constraint c where c.conname = i.indexname) order by indexname`, [table]);
      return rows.map(({ indexdef }) => indexdef);
    },
    /** Exact user rows; timestamps as text so microseconds are compared too. */
    users() {
      return query<{ id: string; email: string; name: string; created_at: string; updated_at: string }>(
        `select id, email, name, created_at::text, updated_at::text from users order by email`);
    },
    async rolesByUser(): Promise<Record<string, string[]>> {
      const rows = await query<{ user_id: string; roles: string[] }>(
        `select user_id, array_agg(role order by role) as roles from user_roles group by user_id`);
      return Object.fromEntries(rows.map(({ user_id, roles }) => [user_id, roles]));
    },
  };
}

const timestamps = [
  { column_name: "created_at", data_type: "timestamp with time zone", character_maximum_length: null, is_nullable: "NO" },
  { column_name: "updated_at", data_type: "timestamp with time zone", character_maximum_length: null, is_nullable: "NO" },
];
const idColumn = { column_name: "id", data_type: "uuid", character_maximum_length: null, is_nullable: "NO" };
const userIdColumn = { column_name: "user_id", data_type: "uuid", character_maximum_length: null, is_nullable: "NO" };

describe("accounts migration round trip on PostgreSQL (E01 Phase 1)", () => {
  const logPath = join(inject("integrationArtifactsDirectory"), "migrations-round-trip.log");
  const scratch = useScratchDatabase("migrations");
  const { query } = scratch;
  const { executedMigrations, tables, columns, constraints, users, rolesByUser } = probes(query);
  const migrate = (direction: "up" | "down", flags: string[]) => scratch.migrate(direction, flags, logPath);

  let baselineUsers: Awaited<ReturnType<typeof users>>;
  let baselineUserColumns: Awaited<ReturnType<typeof columns>>;
  let baselineUserConstraints: Awaited<ReturnType<typeof constraints>>;

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
    expect(await columns("user_roles")).toEqual([
      idColumn, ...timestamps, userIdColumn,
      { column_name: "role", data_type: "text", character_maximum_length: null, is_nullable: "NO" },
    ]);
    expect(await columns("auth_sessions")).toEqual([
      idColumn, ...timestamps, userIdColumn,
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

describe("accounts migration round trip on PostgreSQL (E01 Phase 2)", () => {
  const logPath = join(inject("integrationArtifactsDirectory"), "migrations-round-trip-phase2.log");
  const scratch = useScratchDatabase("migrations_p2");
  const { query } = scratch;
  const { executedMigrations, tables, columns, constraints, indexes, rolesByUser } = probes(query);
  const migrate = (direction: "up" | "down", flags: string[]) => scratch.migrate(direction, flags, logPath);
  const PHASE_1_TABLES = ["auth_sessions", "user_roles", "users"];
  const PHASE_2_TABLES = ["auth_sessions", "email_confirmation_tokens", "rate_limit_buckets", "user_roles", "users"];

  /** Every Phase 1 user column, as text, so the whole row is compared. */
  const phase1Users = () => query(
    `select id, email, name, github_id, email_confirmed_at::text, created_at::text, updated_at::text from users order by email`);
  const sessions = () => query(
    `select id, user_id, token_hash, expires_at::text, created_at::text, updated_at::text from auth_sessions order by token_hash`);

  let phase1UserRows: Awaited<ReturnType<typeof phase1Users>>;
  let phase1Roles: Record<string, string[]>;
  let phase1Sessions: Awaited<ReturnType<typeof sessions>>;
  let phase1UserColumns: Awaited<ReturnType<typeof columns>>;
  let phase1UserConstraints: Awaited<ReturnType<typeof constraints>>;

  it("starts from Phase 1 with users, roles and sessions", async () => {
    await migrate("up", ["--to", ACCOUNTS]);
    expect(await executedMigrations()).toEqual([BASELINE, ACCOUNTS]);

    const [grace, linus] = PRE_EXISTING_USERS;
    for (const user of PRE_EXISTING_USERS) {
      await query(`insert into users (id, created_at, updated_at, email, name) values ($1, $2, $2, $3, $4)`,
        [user.id, user.createdAt, user.email, user.name]);
      await query(`insert into user_roles values (gen_random_uuid(), $2, $2, $1, 'mentee')`, [user.id, user.createdAt]);
    }
    await query(`update users set github_id = '1001', email_confirmed_at = '2026-04-05 06:07:08.9+00' where id = $1`, [grace!.id]);
    await query(`insert into user_roles values (gen_random_uuid(), now(), now(), $1, 'operator')`, [grace!.id]);
    await query(`insert into auth_sessions values (gen_random_uuid(), now(), now(), $1, $2, '2026-12-01 00:00:00+00'),
      (gen_random_uuid(), now(), now(), $3, $4, '2026-12-02 00:00:00+00')`, [grace!.id, "a".repeat(64), linus!.id, "b".repeat(64)]);

    phase1UserRows = await phase1Users();
    phase1Roles = await rolesByUser();
    phase1Sessions = await sessions();
    phase1UserColumns = await columns("users");
    phase1UserConstraints = await constraints("users");
    expect(phase1UserRows).toHaveLength(PRE_EXISTING_USERS.length);
    expect(phase1Sessions).toHaveLength(2);
  });

  it("migrates up to Phase 2 with password_hash, email_confirmation_tokens and rate_limit_buckets", async () => {
    await migrate("up", ["--to", ACCOUNTS_PHASE_2]);

    expect(await executedMigrations()).toEqual([BASELINE, ACCOUNTS, ACCOUNTS_PHASE_2]);
    expect(await tables()).toEqual(PHASE_2_TABLES);
    expect(await columns("users")).toEqual([
      ...phase1UserColumns,
      { column_name: "password_hash", data_type: "character varying", character_maximum_length: 60, is_nullable: "YES" },
    ]);
    expect(await constraints("users")).toEqual(phase1UserConstraints);

    expect(await columns("email_confirmation_tokens")).toEqual([
      idColumn, ...timestamps,
      { column_name: "token_hash", data_type: "character", character_maximum_length: 64, is_nullable: "NO" },
      { column_name: "expires_at", data_type: "timestamp with time zone", character_maximum_length: null, is_nullable: "NO" },
      { column_name: "consumed_at", data_type: "timestamp with time zone", character_maximum_length: null, is_nullable: "YES" },
      userIdColumn,
      { column_name: "email", data_type: "character varying", character_maximum_length: 254, is_nullable: "NO" },
    ]);
    expect(await constraints("email_confirmation_tokens")).toEqual([
      { name: "email_confirmation_tokens_pkey", definition: "PRIMARY KEY (id)" },
      { name: "email_confirmation_tokens_token_hash_unique", definition: "UNIQUE (token_hash)" },
      { name: "email_confirmation_tokens_user_id_foreign", definition: "FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE" },
    ]);
    expect(await indexes("email_confirmation_tokens")).toEqual([
      "CREATE INDEX email_confirmation_tokens_user_id_index ON public.email_confirmation_tokens USING btree (user_id)",
    ]);

    expect(await columns("rate_limit_buckets")).toEqual([
      idColumn, ...timestamps,
      { column_name: "key_hash", data_type: "character", character_maximum_length: 64, is_nullable: "NO" },
      { column_name: "count", data_type: "integer", character_maximum_length: null, is_nullable: "NO" },
      { column_name: "window_ends_at", data_type: "timestamp with time zone", character_maximum_length: null, is_nullable: "NO" },
    ]);
    expect(await constraints("rate_limit_buckets")).toEqual([
      { name: "rate_limit_buckets_key_hash_unique", definition: "UNIQUE (key_hash)" },
      { name: "rate_limit_buckets_pkey", definition: "PRIMARY KEY (id)" },
    ]);
    expect(await indexes("rate_limit_buckets")).toEqual([
      "CREATE INDEX rate_limit_buckets_window_ends_at_index ON public.rate_limit_buckets USING btree (window_ends_at)",
    ]);
  });

  it("keeps every Phase 1 user, role and session, with no password set", async () => {
    expect(await phase1Users()).toEqual(phase1UserRows);
    expect(await rolesByUser()).toEqual(phase1Roles);
    expect(await sessions()).toEqual(phase1Sessions);
    expect(await query(`select count(*)::int as unset from users where password_hash is null`))
      .toEqual([{ unset: PRE_EXISTING_USERS.length }]);
  });

  it("enforces the Phase 2 constraints", async () => {
    const [grace, linus] = PRE_EXISTING_USERS;
    const tokenHash = "c".repeat(64);
    const insertToken = (userId: string, hash: string) => query(
      `insert into email_confirmation_tokens (id, created_at, updated_at, token_hash, expires_at, user_id, email)
        values (gen_random_uuid(), now(), now(), $2, now() + interval '24 hours', $1, 'someone@example.com')`, [userId, hash]);
    await insertToken(grace!.id, tokenHash);
    await expect(insertToken(linus!.id, tokenHash))
      .rejects.toMatchObject({ code: "23505", constraint: "email_confirmation_tokens_token_hash_unique" });
    await expect(insertToken(randomUUID(), "d".repeat(64)))
      .rejects.toMatchObject({ code: "23503", constraint: "email_confirmation_tokens_user_id_foreign" });
    await expect(query(`update users set password_hash = $2 where id = $1`, [grace!.id, "x".repeat(61)]))
      .rejects.toMatchObject({ code: "22001" });

    const insertBucket = (hash: string) => query(
      `insert into rate_limit_buckets values (gen_random_uuid(), now(), now(), $1, 1, now() + interval '1 minute')`, [hash]);
    await insertBucket("e".repeat(64));
    await expect(insertBucket("e".repeat(64)))
      .rejects.toMatchObject({ code: "23505", constraint: "rate_limit_buckets_key_hash_unique" });
    // The limiter's `on conflict ("key_hash")` resolves against that unique constraint.
    expect(await query(`insert into rate_limit_buckets values (gen_random_uuid(), now(), now(), $1, 1, now())
      on conflict ("key_hash") do update set "count" = "rate_limit_buckets"."count" + 1 returning "count"`, ["e".repeat(64)]))
      .toEqual([{ count: 2 }]);

    // Deleting a user cascades to its confirmation links.
    const doomed = randomUUID();
    await query(`insert into users (id, created_at, updated_at, email, name) values ($1, now(), now(), 'doomed@example.com', 'Doomed')`, [doomed]);
    await insertToken(doomed, "f".repeat(64));
    await query(`delete from users where id = $1`, [doomed]);
    expect(await query(`select count(*)::int as left from email_confirmation_tokens where user_id = $1`, [doomed])).toEqual([{ left: 0 }]);
  });

  it("reverts Phase 2 with down() and preserves the Phase 1 schema and data", async () => {
    const [grace] = PRE_EXISTING_USERS;
    await query(`update users set password_hash = $2 where id = $1`, [grace!.id, "$2b$12$".padEnd(60, "x")]);

    await migrate("down", ["--only", ACCOUNTS_PHASE_2]);

    expect(await executedMigrations()).toEqual([BASELINE, ACCOUNTS]);
    expect(await tables()).toEqual(PHASE_1_TABLES);
    expect(await columns("users")).toEqual(phase1UserColumns);
    expect(await constraints("users")).toEqual(phase1UserConstraints);
    expect(await phase1Users()).toEqual(phase1UserRows);
    expect(await rolesByUser()).toEqual(phase1Roles);
    expect(await sessions()).toEqual(phase1Sessions);
  });

  it("migrates up to Phase 2 again after down() with empty new tables", async () => {
    await migrate("up", ["--to", ACCOUNTS_PHASE_2]);

    expect(await executedMigrations()).toEqual([BASELINE, ACCOUNTS, ACCOUNTS_PHASE_2]);
    expect(await tables()).toEqual(PHASE_2_TABLES);
    expect(await query(`select (select count(*)::int from email_confirmation_tokens) as tokens,
      (select count(*)::int from rate_limit_buckets) as buckets,
      (select count(*)::int from users where password_hash is not null) as passwords`))
      .toEqual([{ tokens: 0, buckets: 0, passwords: 0 }]);
    expect(await phase1Users()).toEqual(phase1UserRows);
    expect(await rolesByUser()).toEqual(phase1Roles);
    expect(await sessions()).toEqual(phase1Sessions);
  });
});

describe("accounts migration round trip on PostgreSQL (E01 Phase 3)", () => {
  const logPath = join(inject("integrationArtifactsDirectory"), "migrations-round-trip-phase3.log");
  const scratch = useScratchDatabase("migrations_p3");
  const { query } = scratch;
  const { executedMigrations, tables, columns, constraints, indexes } = probes(query);
  const migrate = (direction: "up" | "down", flags: string[]) => scratch.migrate(direction, flags, logPath);
  const PHASE_2_TABLES = ["auth_sessions", "email_confirmation_tokens", "rate_limit_buckets", "user_roles", "users"];
  const PHASE_3_TABLES = ["auth_sessions", "email_confirmation_tokens", "mentor_invitations", "rate_limit_buckets", "user_roles", "users"];

  /** Every Phase 2 role column, as text, so the whole row is compared. */
  const roleRows = () => query(
    `select id, user_id, role, created_at::text, updated_at::text from user_roles order by user_id, role`);
  const insertInvitation = (email: string, hash: string, extra: { consumedAt?: string; revokedAt?: string } = {}) => query<{ id: string }>(
    `insert into mentor_invitations (id, created_at, updated_at, token_hash, expires_at, consumed_at, email, revoked_at)
      values (gen_random_uuid(), now(), now(), $2, now() + interval '14 days', $3, $1, $4) returning id`,
    [email, hash, extra.consumedAt ?? null, extra.revokedAt ?? null]);

  let phase2RoleRows: Awaited<ReturnType<typeof roleRows>>;
  let phase2RoleColumns: Awaited<ReturnType<typeof columns>>;
  let phase2RoleConstraints: Awaited<ReturnType<typeof constraints>>;
  let phase2UserConstraints: Awaited<ReturnType<typeof constraints>>;

  it("starts from Phase 2 with users and roles", async () => {
    await migrate("up", ["--to", ACCOUNTS_PHASE_2]);
    expect(await executedMigrations()).toEqual([BASELINE, ACCOUNTS, ACCOUNTS_PHASE_2]);

    const [grace] = PRE_EXISTING_USERS;
    for (const user of PRE_EXISTING_USERS) {
      await query(`insert into users (id, created_at, updated_at, email, name) values ($1, $2, $2, $3, $4)`,
        [user.id, user.createdAt, user.email, user.name]);
      await query(`insert into user_roles values (gen_random_uuid(), $2, $2, $1, 'mentee')`, [user.id, user.createdAt]);
    }
    await query(`insert into user_roles values (gen_random_uuid(), now(), now(), $1, 'operator')`, [grace!.id]);

    phase2RoleRows = await roleRows();
    phase2RoleColumns = await columns("user_roles");
    phase2RoleConstraints = await constraints("user_roles");
    phase2UserConstraints = await constraints("users");
    expect(phase2RoleRows).toHaveLength(PRE_EXISTING_USERS.length + 1);
  });

  it("migrates up to Phase 3 with mentor_invitations, its open-email index and user_roles.invitation_id", async () => {
    await migrate("up", ["--to", ACCOUNTS_PHASE_3]);

    expect(await executedMigrations()).toEqual([BASELINE, ACCOUNTS, ACCOUNTS_PHASE_2, ACCOUNTS_PHASE_3]);
    expect(await tables()).toEqual(PHASE_3_TABLES);
    expect(await columns("mentor_invitations")).toEqual([
      idColumn, ...timestamps,
      { column_name: "token_hash", data_type: "character", character_maximum_length: 64, is_nullable: "NO" },
      { column_name: "expires_at", data_type: "timestamp with time zone", character_maximum_length: null, is_nullable: "NO" },
      { column_name: "consumed_at", data_type: "timestamp with time zone", character_maximum_length: null, is_nullable: "YES" },
      { column_name: "email", data_type: "character varying", character_maximum_length: 254, is_nullable: "NO" },
      { column_name: "revoked_at", data_type: "timestamp with time zone", character_maximum_length: null, is_nullable: "YES" },
      { column_name: "accepted_by_user_id", data_type: "uuid", character_maximum_length: null, is_nullable: "YES" },
    ]);
    expect(await constraints("mentor_invitations")).toEqual([
      { name: "mentor_invitations_accepted_by_user_id_foreign", definition: "FOREIGN KEY (accepted_by_user_id) REFERENCES users(id) ON DELETE SET NULL" },
      { name: "mentor_invitations_pkey", definition: "PRIMARY KEY (id)" },
      { name: "mentor_invitations_token_hash_unique", definition: "UNIQUE (token_hash)" },
    ]);
    expect(await indexes("mentor_invitations")).toEqual([
      "CREATE UNIQUE INDEX mentor_invitations_open_email_unique ON public.mentor_invitations USING btree (email) WHERE ((consumed_at IS NULL) AND (revoked_at IS NULL))",
    ]);

    expect(await columns("user_roles")).toEqual([
      ...phase2RoleColumns,
      { column_name: "invitation_id", data_type: "uuid", character_maximum_length: null, is_nullable: "YES" },
    ]);
    expect(await constraints("user_roles")).toEqual([
      ...phase2RoleConstraints,
      { name: "user_roles_invitation_id_foreign", definition: "FOREIGN KEY (invitation_id) REFERENCES mentor_invitations(id) ON DELETE SET NULL" },
      { name: "user_roles_invitation_mentor_check", definition: "CHECK (((invitation_id IS NULL) OR (role = 'mentor'::text)))" },
    ].sort((a, b) => a.name.localeCompare(b.name)));
    expect(await constraints("users")).toEqual(phase2UserConstraints);
    // Existing roles keep every column and get no invitation.
    expect(await roleRows()).toEqual(phase2RoleRows);
    expect(await query(`select count(*)::int as unset from user_roles where invitation_id is null`))
      .toEqual([{ unset: phase2RoleRows.length }]);
  });

  it("allows one open invitation per email, any number of closed ones, and no time-dependent predicate", async () => {
    // Closed rows (revoked or consumed) never block a new open row.
    await insertInvitation("ada@example.com", "1".repeat(64), { revokedAt: "2026-10-01 00:00:00+00" });
    await insertInvitation("ada@example.com", "2".repeat(64), { consumedAt: "2026-10-02 00:00:00+00" });
    await insertInvitation("ada@example.com", "3".repeat(64), { consumedAt: "2026-10-03 00:00:00+00", revokedAt: "2026-10-03 00:00:00+00" });
    const [open] = await insertInvitation("ada@example.com", "4".repeat(64));
    await expect(insertInvitation("ada@example.com", "5".repeat(64)))
      .rejects.toMatchObject({ code: "23505", constraint: "mentor_invitations_open_email_unique" });

    // An expired open row still blocks until it is closed.
    await query(`update mentor_invitations set expires_at = now() - interval '1 day' where id = $1`, [open!.id]);
    await expect(insertInvitation("ada@example.com", "5".repeat(64)))
      .rejects.toMatchObject({ code: "23505", constraint: "mentor_invitations_open_email_unique" });
    await query(`update mentor_invitations set revoked_at = now() where id = $1`, [open!.id]);
    await insertInvitation("ada@example.com", "5".repeat(64));

    // Another address is independent; token hashes stay globally unique.
    await insertInvitation("grace@example.com", "6".repeat(64));
    await expect(insertInvitation("linus@example.com", "6".repeat(64)))
      .rejects.toMatchObject({ code: "23505", constraint: "mentor_invitations_token_hash_unique" });
    await expect(insertInvitation("x".repeat(250) + "@e.co", "7".repeat(64))).rejects.toMatchObject({ code: "22001" });

    expect(await query(`select email, count(*)::int as open from mentor_invitations
      where consumed_at is null and revoked_at is null group by email order by email`))
      .toEqual([{ email: "ada@example.com", open: 1 }, { email: "grace@example.com", open: 1 }]);
  });

  it("links a mentor role to its invitation and the invitation to its accepting user", async () => {
    const [grace, linus] = PRE_EXISTING_USERS;
    const [invitation] = await insertInvitation("linus@example.com", "8".repeat(64), { consumedAt: "2026-10-28 00:00:00+00" });
    await query(`update mentor_invitations set accepted_by_user_id = $2 where id = $1`, [invitation!.id, linus!.id]);
    await query(`insert into user_roles (id, created_at, updated_at, user_id, role, invitation_id)
      values (gen_random_uuid(), now(), now(), $1, 'mentor', $2)`, [linus!.id, invitation!.id]);

    // invitation_id is set only for mentor.
    await expect(query(`update user_roles set invitation_id = $2 where user_id = $1 and role = 'operator'`, [grace!.id, invitation!.id]))
      .rejects.toMatchObject({ code: "23514", constraint: "user_roles_invitation_mentor_check" });
    await expect(query(`insert into user_roles (id, created_at, updated_at, user_id, role, invitation_id)
      values (gen_random_uuid(), now(), now(), $1, 'mentee', $2)`, [randomUUID(), invitation!.id]))
      .rejects.toMatchObject({ code: "23514", constraint: "user_roles_invitation_mentor_check" });
    await expect(query(`update user_roles set invitation_id = $2 where user_id = $1 and role = 'mentor'`, [linus!.id, randomUUID()]))
      .rejects.toMatchObject({ code: "23503", constraint: "user_roles_invitation_id_foreign" });
    await expect(query(`update mentor_invitations set accepted_by_user_id = $2 where id = $1`, [invitation!.id, randomUUID()]))
      .rejects.toMatchObject({ code: "23503", constraint: "mentor_invitations_accepted_by_user_id_foreign" });

    // Deleting the accepting user keeps the invitation (accepted_by set null); its roles cascade.
    const doomed = randomUUID();
    await query(`insert into users (id, created_at, updated_at, email, name) values ($1, now(), now(), 'doomed@example.com', 'Doomed')`, [doomed]);
    const [doomedInvitation] = await insertInvitation("doomed@example.com", "9".repeat(64), { consumedAt: "2026-10-28 00:00:00+00" });
    await query(`update mentor_invitations set accepted_by_user_id = $2 where id = $1`, [doomedInvitation!.id, doomed]);
    await query(`insert into user_roles (id, created_at, updated_at, user_id, role, invitation_id)
      values (gen_random_uuid(), now(), now(), $1, 'mentor', $2)`, [doomed, doomedInvitation!.id]);
    await query(`delete from users where id = $1`, [doomed]);
    expect(await query(`select accepted_by_user_id, consumed_at::text from mentor_invitations where id = $1`, [doomedInvitation!.id]))
      .toEqual([{ accepted_by_user_id: null, consumed_at: "2026-10-28 00:00:00+00" }]);
    expect(await query(`select count(*)::int as left from user_roles where user_id = $1`, [doomed])).toEqual([{ left: 0 }]);
  });

  it("reverts Phase 3 with down() and preserves the Phase 2 schema and roles", async () => {
    const [, linus] = PRE_EXISTING_USERS;
    await migrate("down", ["--only", ACCOUNTS_PHASE_3]);

    expect(await executedMigrations()).toEqual([BASELINE, ACCOUNTS, ACCOUNTS_PHASE_2]);
    expect(await tables()).toEqual(PHASE_2_TABLES);
    expect(await columns("user_roles")).toEqual(phase2RoleColumns);
    expect(await constraints("user_roles")).toEqual(phase2RoleConstraints);
    expect(await constraints("users")).toEqual(phase2UserConstraints);
    // Phase 2 rows are untouched; the mentor role granted under Phase 3 stays, without its invitation link
    // (disposable environments only; the production rollback is code-only, spec Risks).
    const rows = await roleRows();
    expect(rows.filter(({ role }) => role !== "mentor")).toEqual(phase2RoleRows);
    expect(rows.filter(({ role }) => role === "mentor").map(({ user_id }) => user_id)).toEqual([linus!.id]);
  });

  it("migrates up to Phase 3 again after down() with an empty invitations table", async () => {
    await migrate("up", ["--to", ACCOUNTS_PHASE_3]);

    expect(await executedMigrations()).toEqual([BASELINE, ACCOUNTS, ACCOUNTS_PHASE_2, ACCOUNTS_PHASE_3]);
    expect(await tables()).toEqual(PHASE_3_TABLES);
    expect(await query(`select (select count(*)::int from mentor_invitations) as invitations,
      (select count(*)::int from user_roles where invitation_id is not null) as linked`))
      .toEqual([{ invitations: 0, linked: 0 }]);
    expect(await indexes("mentor_invitations")).toEqual([
      "CREATE UNIQUE INDEX mentor_invitations_open_email_unique ON public.mentor_invitations USING btree (email) WHERE ((consumed_at IS NULL) AND (revoked_at IS NULL))",
    ]);
  });
});
