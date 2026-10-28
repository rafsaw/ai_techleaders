import { Migration } from '@mikro-orm/migrations';

export class Migration20261028212643 extends Migration {

  override name = 'Migration20261028212643';

  override up(): void | Promise<void> {
    this.addSql(`create table "mentor_invitations" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "token_hash" char(64) not null, "expires_at" timestamptz not null, "consumed_at" timestamptz null, "email" varchar(254) not null, "revoked_at" timestamptz null, "accepted_by_user_id" uuid null, primary key ("id"));`);
    this.addSql(`alter table "mentor_invitations" add constraint "mentor_invitations_token_hash_unique" unique ("token_hash");`);
    this.addSql(`create unique index "mentor_invitations_open_email_unique" on "mentor_invitations" ("email") where consumed_at is null and revoked_at is null;`);

    this.addSql(`alter table "user_roles" add "invitation_id" uuid null;`);
    this.addSql(`alter table "user_roles" add constraint "user_roles_invitation_id_foreign" foreign key ("invitation_id") references "mentor_invitations" ("id") on delete set null;`);
    this.addSql(`alter table "user_roles" add constraint "user_roles_invitation_mentor_check" check (invitation_id is null or role = 'mentor');`);

    this.addSql(`alter table "mentor_invitations" add constraint "mentor_invitations_accepted_by_user_id_foreign" foreign key ("accepted_by_user_id") references "users" ("id") on delete set null;`);
  }

  override down(): void | Promise<void> {
    // Reverse order of up(); dropping the column drops its foreign key, and
    // dropping the table drops its unique constraint, partial index and foreign key.
    this.addSql(`alter table "user_roles" drop constraint "user_roles_invitation_mentor_check";`);
    this.addSql(`alter table "user_roles" drop column "invitation_id";`);

    this.addSql(`drop table if exists "mentor_invitations" cascade;`);
  }

}
