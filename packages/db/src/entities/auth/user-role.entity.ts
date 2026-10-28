import { ROLES } from "@devmentor/core/validators/auth/role.schema";
import { defineEntity, p } from "@mikro-orm/core";

import { baseProperties } from "../base";
import { User } from "./user.entity";

const UserRoleSchema = defineEntity({
  name: "UserRole",
  tableName: "user_roles",
  uniques: [{ properties: ["user", "role"] }],
  properties: {
    ...baseProperties,
    user: () => p.manyToOne(User).deleteRule("cascade"),
    role: p.enum(ROLES),
  },
});

/** One role held by one user. An account may hold several (unique per user and role). */
export class UserRole extends UserRoleSchema.class {}
UserRoleSchema.setClass(UserRole);
