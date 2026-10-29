import { Migration } from '@mikro-orm/migrations';

export class Migration20261028165323 extends Migration {

  override name = 'Migration20261028165323';

  override up(): void | Promise<void> {
    this.addSql(`create table "rate_limit_buckets" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "key_hash" char(64) not null, "count" int not null, "window_ends_at" timestamptz not null, primary key ("id"));`);
    this.addSql(`alter table "rate_limit_buckets" add constraint "rate_limit_buckets_key_hash_unique" unique ("key_hash");`);
    this.addSql(`create index "rate_limit_buckets_window_ends_at_index" on "rate_limit_buckets" ("window_ends_at");`);

    this.addSql(`create table "email_confirmation_tokens" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "token_hash" char(64) not null, "expires_at" timestamptz not null, "consumed_at" timestamptz null, "user_id" uuid not null, "email" varchar(254) not null, primary key ("id"));`);
    this.addSql(`alter table "email_confirmation_tokens" add constraint "email_confirmation_tokens_token_hash_unique" unique ("token_hash");`);
    this.addSql(`create index "email_confirmation_tokens_user_id_index" on "email_confirmation_tokens" ("user_id");`);

    this.addSql(`alter table "users" add "password_hash" varchar(60) null;`);

    this.addSql(`alter table "email_confirmation_tokens" add constraint "email_confirmation_tokens_user_id_foreign" foreign key ("user_id") references "users" ("id") on delete cascade;`);
  }

  override down(): void | Promise<void> {
    // Reverse order of up(); dropping the table drops its foreign key, unique constraint and index.
    this.addSql(`alter table "users" drop column "password_hash";`);

    this.addSql(`drop table if exists "email_confirmation_tokens" cascade;`);

    this.addSql(`drop table if exists "rate_limit_buckets" cascade;`);
  }

}
