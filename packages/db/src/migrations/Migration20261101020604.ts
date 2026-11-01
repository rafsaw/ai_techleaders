import { Migration } from '@mikro-orm/migrations';

export class Migration20261101020604 extends Migration {

  override name = 'Migration20261101020604';

  override up(): void | Promise<void> {
    this.addSql(`create table "payout_accounts" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "mentor_profile_id" uuid not null, "stripe_account_id" varchar(64) null, "country" char(2) not null, "provisioning_state" text not null default 'pending', "status" text not null default 'incomplete', "last_reconciled_at" timestamptz null, primary key ("id"));`);
    this.addSql(`alter table "payout_accounts" add constraint "payout_accounts_mentor_profile_id_unique" unique ("mentor_profile_id");`);
    this.addSql(`alter table "payout_accounts" add constraint "payout_accounts_stripe_account_id_unique" unique ("stripe_account_id");`);

    this.addSql(`alter table "payout_accounts" add constraint "payout_accounts_mentor_profile_id_foreign" foreign key ("mentor_profile_id") references "mentor_profiles" ("id") on delete restrict;`);
    this.addSql(`alter table "payout_accounts" add constraint "payout_accounts_provisioned_id_check" check ((provisioning_state = 'provisioned') = (stripe_account_id is not null));`);
    this.addSql(`alter table "payout_accounts" add constraint "payout_accounts_provisioning_state_check" check ("provisioning_state" in ('pending', 'provisioned', 'reconciliation_required', 'failed'));`);
    this.addSql(`alter table "payout_accounts" add constraint "payout_accounts_status_check" check ("status" in ('incomplete', 'pending', 'ready', 'blocked'));`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "payout_accounts" cascade;`);
  }

}
