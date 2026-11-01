import { Migration } from '@mikro-orm/migrations';

export class Migration20261101041447 extends Migration {

  override name = 'Migration20261101041447';

  override up(): void | Promise<void> {
    this.addSql(`create table "availability_slots" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "mentor_profile_id" uuid not null, "starts_at" timestamptz not null, "booked_at" timestamptz null, primary key ("id"));`);
    this.addSql(`alter table "availability_slots" add constraint "availability_slots_mentor_profile_id_starts_at_unique" unique ("mentor_profile_id", "starts_at");`);

    this.addSql(`alter table "availability_slots" add constraint "availability_slots_mentor_profile_id_foreign" foreign key ("mentor_profile_id") references "mentor_profiles" ("id") on delete restrict;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "availability_slots" cascade;`);
  }

}
