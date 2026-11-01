import { Migration } from "@mikro-orm/migrations";

export class Migration20261031173300 extends Migration {
  override name = "Migration20261031173300";

  override up(): void | Promise<void> {
    this.addSql(`create table "mentor_profiles" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "user_id" uuid not null, "area" text not null, "description" text not null, "public_work_links" text[] not null, "price_25_cents" integer not null, "price_50_cents" integer not null, primary key ("id"));`);
    this.addSql(`alter table "mentor_profiles" add constraint "mentor_profiles_user_id_unique" unique ("user_id");`);
    this.addSql(`alter table "mentor_profiles" add constraint "mentor_profiles_user_id_foreign" foreign key ("user_id") references "users" ("id") on delete cascade;`);
    this.addSql(`alter table "mentor_profiles" add constraint "mentor_profiles_area_check" check ("area" in ('typescript', 'react', 'python'));`);
    this.addSql(`alter table "mentor_profiles" add constraint "mentor_profiles_price_25_cents_check" check (price_25_cents > 0);`);
    this.addSql(`alter table "mentor_profiles" add constraint "mentor_profiles_price_50_cents_check" check (price_50_cents > 0);`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "mentor_profiles" cascade;`);
  }
}
