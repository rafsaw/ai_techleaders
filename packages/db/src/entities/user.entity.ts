import { defineEntity, p } from "@mikro-orm/core";

import { baseProperties } from "./base";

const UserSchema = defineEntity({
  name: "User",
  tableName: "users",
  properties: {
    ...baseProperties,
    email: p.string().unique(),
    name: p.string(),
  },
});

export class User extends UserSchema.class {}
UserSchema.setClass(User);
