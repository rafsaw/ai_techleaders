import type { Configuration } from "@mikro-orm/core";
import type { PostgreSqlDriver } from "@mikro-orm/postgresql";
import { describe, expect, it } from "vitest";

import { Migration20261013225312 } from "./migrations/Migration20261013225312";

describe("initial migration", () => {
  it("creates the users table and enforces unique email", () => {
    const migration = new Migration20261013225312({} as PostgreSqlDriver, {} as Configuration);
    migration.up();
    expect(migration.name).toBe("Migration20261013225312");
    expect(migration.getQueries()).toEqual([
      'create table "users" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "email" varchar(255) not null, "name" varchar(255) not null, primary key ("id"));',
      'alter table "users" add constraint "users_email_unique" unique ("email");',
    ]);
  });
});
