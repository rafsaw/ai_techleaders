import { defineEntity, p } from "@mikro-orm/core";

import { baseProperties } from "../base";

const UserSchema = defineEntity({
  name: "User",
  tableName: "users",
  properties: {
    ...baseProperties,
    email: p.string().unique(),
    /** The display name. */
    name: p.string(),
    /** GitHub numeric id as a string; null until the account signs in with GitHub. */
    githubId: p.string().length(32).nullable().unique(),
    /** Set for GitHub sign-ins (verified primary email) and on email confirmation. */
    emailConfirmedAt: p.datetime().nullable(),
  },
});

export class User extends UserSchema.class {}
UserSchema.setClass(User);
