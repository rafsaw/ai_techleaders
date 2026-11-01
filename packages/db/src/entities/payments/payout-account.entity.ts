import { defineEntity, p } from "@mikro-orm/core";

import { baseProperties } from "../base";
import { MentorProfile } from "../mentors/mentor-profile.entity";

export const provisioningStates = ["pending", "provisioned", "reconciliation_required", "failed"] as const;
export const payoutStatuses = ["incomplete", "pending", "ready", "blocked"] as const;

const PayoutAccountSchema = defineEntity({
  name: "PayoutAccount",
  tableName: "payout_accounts",
  checks: [{
    name: "payout_accounts_provisioned_id_check",
    expression: "(provisioning_state = 'provisioned') = (stripe_account_id is not null)",
  }],
  properties: {
    ...baseProperties,
    mentorProfile: () => p.manyToOne(MentorProfile).fieldName("mentor_profile_id").unique().deleteRule("restrict"),
    stripeAccountId: p.string().length(64).nullable().unique().fieldName("stripe_account_id"),
    country: p.string().columnType("char(2)"),
    provisioningState: p.enum(provisioningStates).default("pending").fieldName("provisioning_state"),
    status: p.enum(payoutStatuses).default("incomplete"),
    lastReconciledAt: p.datetime().nullable().fieldName("last_reconciled_at"),
  },
});

/** A mentor's durable Connect binding and last synchronized payout state. */
export class PayoutAccount extends PayoutAccountSchema.class {}
PayoutAccountSchema.setClass(PayoutAccount);
