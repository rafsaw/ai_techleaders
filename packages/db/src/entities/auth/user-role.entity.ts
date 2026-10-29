import { ROLES } from "@devmentor/core/validators/auth/role.schema";
import { defineEntity, p } from "@mikro-orm/core";

import { baseProperties } from "../base";
import { MentorInvitation } from "./mentor-invitation.entity";
import { User } from "./user.entity";

const UserRoleSchema = defineEntity({
  name: "UserRole",
  tableName: "user_roles",
  uniques: [{ properties: ["user", "role"] }],
  /** Only a mentor role records the invitation that granted it. */
  checks: [{ name: "user_roles_invitation_mentor_check", expression: "invitation_id is null or role = 'mentor'" }],
  properties: {
    ...baseProperties,
    user: () => p.manyToOne(User).deleteRule("cascade"),
    role: p.enum(ROLES),
    /** The invitation whose acceptance granted this role; set only for `mentor`. */
    invitation: () => p.manyToOne(MentorInvitation).nullable(),
  },
});

/** One role held by one user. An account may hold several (unique per user and role). */
export class UserRole extends UserRoleSchema.class {}
UserRoleSchema.setClass(UserRole);
