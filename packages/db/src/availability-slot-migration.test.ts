import type { Configuration } from "@mikro-orm/core";
import type { PostgreSqlDriver } from "@mikro-orm/postgresql";
import { describe, expect, it } from "vitest";

import { Migration20261101041447 } from "./migrations/Migration20261101041447";

function migration() {
  return new Migration20261101041447({} as PostgreSqlDriver, {} as Configuration);
}

describe("availability slot migration", () => {
  it("creates slots with a restricted profile and unique profile/start pair", () => {
    const m = migration();
    m.up();
    const sql = m.getQueries().join("\n");
    expect(m.name).toBe("Migration20261101041447");
    expect(sql).toContain('create table "availability_slots"');
    expect(sql).toContain('"mentor_profile_id" uuid not null');
    expect(sql).toContain('"starts_at" timestamptz not null');
    expect(sql).toContain('"booked_at" timestamptz null');
    expect(sql).toContain('unique ("mentor_profile_id", "starts_at")');
    expect(sql).toContain('references "mentor_profiles" ("id") on delete restrict');
  });

  it("drops slots on rollback", () => {
    const m = migration();
    m.down();
    expect(m.getQueries()).toEqual(['drop table if exists "availability_slots" cascade;']);
  });
});
