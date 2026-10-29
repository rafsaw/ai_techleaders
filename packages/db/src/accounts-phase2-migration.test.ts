import type { Configuration } from "@mikro-orm/core";
import type { PostgreSqlDriver } from "@mikro-orm/postgresql";
import { describe, expect, it } from "vitest";

import { Migration20261028165323 } from "./migrations/Migration20261028165323";

function migration() {
  return new Migration20261028165323({} as PostgreSqlDriver, {} as Configuration);
}

describe("accounts migration (E01 Phase 2)", () => {
  it("creates rate_limit_buckets and email_confirmation_tokens and adds users.password_hash", () => {
    const m = migration();
    m.up();
    expect(m.name).toBe("Migration20261028165323");
    expect(m.getQueries()).toEqual([
      'create table "rate_limit_buckets" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "key_hash" char(64) not null, "count" int not null, "window_ends_at" timestamptz not null, primary key ("id"));',
      'alter table "rate_limit_buckets" add constraint "rate_limit_buckets_key_hash_unique" unique ("key_hash");',
      'create index "rate_limit_buckets_window_ends_at_index" on "rate_limit_buckets" ("window_ends_at");',
      'create table "email_confirmation_tokens" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "token_hash" char(64) not null, "expires_at" timestamptz not null, "consumed_at" timestamptz null, "user_id" uuid not null, "email" varchar(254) not null, primary key ("id"));',
      'alter table "email_confirmation_tokens" add constraint "email_confirmation_tokens_token_hash_unique" unique ("token_hash");',
      'create index "email_confirmation_tokens_user_id_index" on "email_confirmation_tokens" ("user_id");',
      'alter table "users" add "password_hash" varchar(60) null;',
      'alter table "email_confirmation_tokens" add constraint "email_confirmation_tokens_user_id_foreign" foreign key ("user_id") references "users" ("id") on delete cascade;',
    ]);
  });

  it("reverts in reverse order: the users column, then both tables", () => {
    const m = migration();
    m.down();
    expect(m.getQueries()).toEqual([
      'alter table "users" drop column "password_hash";',
      'drop table if exists "email_confirmation_tokens" cascade;',
      'drop table if exists "rate_limit_buckets" cascade;',
    ]);
  });
});
