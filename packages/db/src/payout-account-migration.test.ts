import type { Configuration } from "@mikro-orm/core";
import type { PostgreSqlDriver } from "@mikro-orm/postgresql";
import { describe, expect, it } from "vitest";

import { Migration20261101020604 } from "./migrations/Migration20261101020604";

function migration() {
  return new Migration20261101020604({} as PostgreSqlDriver, {} as Configuration);
}

describe("payout account migration", () => {
  it("creates the account table with its binding, state and uniqueness constraints", () => {
    const m = migration();
    m.up();
    const sql = m.getQueries().join("\n");
    expect(sql).toContain('create table "payout_accounts"');
    expect(sql).toContain('"mentor_profile_id" uuid not null');
    expect(sql).toContain('"stripe_account_id" varchar(64) null');
    expect(sql).toContain("default 'pending'");
    expect(sql).toContain("default 'incomplete'");
    expect(sql).toContain('unique ("mentor_profile_id")');
    expect(sql).toContain('unique ("stripe_account_id")');
    expect(sql).toContain('references "mentor_profiles" ("id") on delete restrict');
    expect(sql).toContain("(provisioning_state = 'provisioned') = (stripe_account_id is not null)");
    expect(sql).toContain("'pending', 'provisioned', 'reconciliation_required', 'failed'");
    expect(sql).toContain("'incomplete', 'pending', 'ready', 'blocked'");
  });

  it("drops the table on rollback", () => {
    const m = migration();
    m.down();
    expect(m.getQueries()).toEqual(['drop table if exists "payout_accounts" cascade;']);
  });
});
