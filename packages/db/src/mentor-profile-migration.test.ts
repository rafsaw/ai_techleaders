import type { Configuration } from "@mikro-orm/core";
import type { PostgreSqlDriver } from "@mikro-orm/postgresql";
import { describe, expect, it } from "vitest";

import { entities, MentorProfile } from "./entities";
import { Migration20261031173300 } from "./migrations/Migration20261031173300";

function migration() {
  return new Migration20261031173300({} as PostgreSqlDriver, {} as Configuration);
}

describe("mentor profile migration (E02 Phase 1)", () => {
  it("registers the entity and creates the constrained profile table", () => {
    expect(entities).toContain(MentorProfile);
    const m = migration();
    m.up();
    expect(m.name).toBe("Migration20261031173300");
    expect(m.getQueries()).toEqual([
      'create table "mentor_profiles" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "user_id" uuid not null, "area" text not null, "description" text not null, "public_work_links" text[] not null, "price_25_cents" integer not null, "price_50_cents" integer not null, primary key ("id"));',
      'alter table "mentor_profiles" add constraint "mentor_profiles_user_id_unique" unique ("user_id");',
      'alter table "mentor_profiles" add constraint "mentor_profiles_user_id_foreign" foreign key ("user_id") references "users" ("id") on delete cascade;',
      'alter table "mentor_profiles" add constraint "mentor_profiles_area_check" check ("area" in (\'typescript\', \'react\', \'python\'));',
      'alter table "mentor_profiles" add constraint "mentor_profiles_price_25_cents_check" check (price_25_cents > 0);',
      'alter table "mentor_profiles" add constraint "mentor_profiles_price_50_cents_check" check (price_50_cents > 0);',
    ]);
  });

  it("drops the table on rollback", () => {
    const m = migration();
    m.down();
    expect(m.getQueries()).toEqual(['drop table if exists "mentor_profiles" cascade;']);
  });
});
