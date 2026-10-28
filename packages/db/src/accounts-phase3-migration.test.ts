import type { Configuration } from "@mikro-orm/core";
import type { PostgreSqlDriver } from "@mikro-orm/postgresql";
import { describe, expect, it } from "vitest";

import { Migration20261028212643 } from "./migrations/Migration20261028212643";

function migration() {
  return new Migration20261028212643({} as PostgreSqlDriver, {} as Configuration);
}

describe("accounts migration (E01 Phase 3)", () => {
  it("creates mentor_invitations with the partial open-email index and adds user_roles.invitation_id", () => {
    const m = migration();
    m.up();
    expect(m.name).toBe("Migration20261028212643");
    expect(m.getQueries()).toEqual([
      'create table "mentor_invitations" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "token_hash" char(64) not null, "expires_at" timestamptz not null, "consumed_at" timestamptz null, "email" varchar(254) not null, "revoked_at" timestamptz null, "accepted_by_user_id" uuid null, primary key ("id"));',
      'alter table "mentor_invitations" add constraint "mentor_invitations_token_hash_unique" unique ("token_hash");',
      'create unique index "mentor_invitations_open_email_unique" on "mentor_invitations" ("email") where consumed_at is null and revoked_at is null;',
      'alter table "user_roles" add "invitation_id" uuid null;',
      'alter table "user_roles" add constraint "user_roles_invitation_id_foreign" foreign key ("invitation_id") references "mentor_invitations" ("id") on delete set null;',
      'alter table "user_roles" add constraint "user_roles_invitation_mentor_check" check (invitation_id is null or role = \'mentor\');',
      'alter table "mentor_invitations" add constraint "mentor_invitations_accepted_by_user_id_foreign" foreign key ("accepted_by_user_id") references "users" ("id") on delete set null;',
    ]);
  });

  it("reverts in reverse order: the user_roles check and column, then the table", () => {
    const m = migration();
    m.down();
    expect(m.getQueries()).toEqual([
      'alter table "user_roles" drop constraint "user_roles_invitation_mentor_check";',
      'alter table "user_roles" drop column "invitation_id";',
      'drop table if exists "mentor_invitations" cascade;',
    ]);
  });
});
