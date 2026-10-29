import { Migration } from '@mikro-orm/migrations';

export class Migration20261028002328 extends Migration {

  override name = 'Migration20261028002328';

  override up(): void | Promise<void> {
    this.addSql(`create table "auth_sessions" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "user_id" uuid not null, "token_hash" char(64) not null, "expires_at" timestamptz not null, primary key ("id"));`);
    this.addSql(`create index "auth_sessions_user_id_index" on "auth_sessions" ("user_id");`);
    this.addSql(`alter table "auth_sessions" add constraint "auth_sessions_token_hash_unique" unique ("token_hash");`);

    this.addSql(`create table "user_roles" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "user_id" uuid not null, "role" text not null, primary key ("id"));`);
    this.addSql(`alter table "user_roles" add constraint "user_roles_user_id_role_unique" unique ("user_id", "role");`);

    this.addSql(`alter table "users" add "github_id" varchar(32) null, add "email_confirmed_at" timestamptz null;`);
    this.addSql(`alter table "users" add constraint "users_github_id_unique" unique ("github_id");`);

    this.addSql(`alter table "auth_sessions" add constraint "auth_sessions_user_id_foreign" foreign key ("user_id") references "users" ("id") on delete cascade;`);

    this.addSql(`alter table "user_roles" add constraint "user_roles_user_id_foreign" foreign key ("user_id") references "users" ("id") on delete cascade;`);
    this.addSql(`alter table "user_roles" add constraint "user_roles_role_check" check ("role" in ('mentee', 'mentor', 'operator'));`);

    // Every existing account (seeded or admin-created) keeps working as a mentee.
    this.addSql(`insert into "user_roles" ("id", "created_at", "updated_at", "user_id", "role") select gen_random_uuid(), now(), now(), "id", 'mentee' from "users";`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "auth_sessions" cascade;`);
    this.addSql(`drop table if exists "user_roles" cascade;`);

    this.addSql(`alter table "users" drop constraint "users_github_id_unique";`);
    this.addSql(`alter table "users" drop column "github_id", drop column "email_confirmed_at";`);
  }

}
