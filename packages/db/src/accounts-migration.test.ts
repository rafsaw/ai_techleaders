import type { Configuration } from "@mikro-orm/core";
import type { PostgreSqlDriver } from "@mikro-orm/postgresql";
import { describe, expect, it } from "vitest";

import { Migration20261028002328 } from "./migrations/Migration20261028002328";

function migration() {
  return new Migration20261028002328({} as PostgreSqlDriver, {} as Configuration);
}

describe("accounts and roles migration (E01 Phase 1)", () => {
  it("creates auth_sessions and user_roles, adds the users columns, then backfills mentee", () => {
    const m = migration();
    m.up();
    expect(m.name).toBe("Migration20261028002328");
    expect(m.getQueries()).toEqual([
      'create table "auth_sessions" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "user_id" uuid not null, "token_hash" char(64) not null, "expires_at" timestamptz not null, primary key ("id"));',
      'create index "auth_sessions_user_id_index" on "auth_sessions" ("user_id");',
      'alter table "auth_sessions" add constraint "auth_sessions_token_hash_unique" unique ("token_hash");',
      'create table "user_roles" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "user_id" uuid not null, "role" text not null, primary key ("id"));',
      'alter table "user_roles" add constraint "user_roles_user_id_role_unique" unique ("user_id", "role");',
      'alter table "users" add "github_id" varchar(32) null, add "email_confirmed_at" timestamptz null;',
      'alter table "users" add constraint "users_github_id_unique" unique ("github_id");',
      'alter table "auth_sessions" add constraint "auth_sessions_user_id_foreign" foreign key ("user_id") references "users" ("id") on delete cascade;',
      'alter table "user_roles" add constraint "user_roles_user_id_foreign" foreign key ("user_id") references "users" ("id") on delete cascade;',
      'alter table "user_roles" add constraint "user_roles_role_check" check ("role" in (\'mentee\', \'mentor\', \'operator\'));',
      'insert into "user_roles" ("id", "created_at", "updated_at", "user_id", "role") select gen_random_uuid(), now(), now(), "id", \'mentee\' from "users";',
    ]);
  });

  it("reverts by dropping both tables and the users columns", () => {
    const m = migration();
    m.down();
    expect(m.getQueries()).toEqual([
      'drop table if exists "auth_sessions" cascade;',
      'drop table if exists "user_roles" cascade;',
      'alter table "users" drop constraint "users_github_id_unique";',
      'alter table "users" drop column "github_id", drop column "email_confirmed_at";',
    ]);
  });
});
