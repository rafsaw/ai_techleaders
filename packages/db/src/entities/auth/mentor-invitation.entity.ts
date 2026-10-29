import { defineEntity, p } from "@mikro-orm/core";

import { baseProperties } from "../base";
import { singleUseTokenProperties } from "../single-use-token";
import { User } from "./user.entity";

const MentorInvitationSchema = defineEntity({
  name: "MentorInvitation",
  tableName: "mentor_invitations",
  uniques: [
    {
      /**
       * At most one open invitation per address, an expired one included until
       * it is closed (revoked) or resent. No time-dependent predicate.
       */
      name: "mentor_invitations_open_email_unique",
      properties: ["email"],
      where: "consumed_at is null and revoked_at is null",
    },
  ],
  properties: {
    ...baseProperties,
    ...singleUseTokenProperties,
    /** The invited address, trimmed and lowercased; bound at create and never changed. */
    email: p.string().length(254),
    /** Set by revoke, and when create closes an expired open row. */
    revokedAt: p.datetime().nullable(),
    /** The account that accepted; `consumedAt` is the acceptance time. */
    acceptedBy: () => p.manyToOne(User).nullable().deleteRule("set null").fieldName("accepted_by_user_id"),
  },
});

/**
 * One email-bound mentor invitation (platform P9). Read and consume only through
 * the single-use token helpers; the invitation service checks the bound email
 * and revocation around them. Neither a note nor the raw token or link is stored.
 */
export class MentorInvitation extends MentorInvitationSchema.class {}
MentorInvitationSchema.setClass(MentorInvitation);
