import { defineEntity, p } from "@mikro-orm/core";

import { baseProperties } from "../base";
import { User } from "./user.entity";

const AuthSessionSchema = defineEntity({
  name: "AuthSession",
  tableName: "auth_sessions",
  properties: {
    ...baseProperties,
    user: () => p.manyToOne(User).deleteRule("cascade").index(),
    /** SHA-256 hex of the raw cookie token (`hashToken`); the raw token is never stored. */
    tokenHash: p.string().columnType("char(64)").unique(),
    expiresAt: p.datetime(),
  },
});

/** A signed-in browser session. Named to avoid the domain term "Session" (text session). */
export class AuthSession extends AuthSessionSchema.class {}
AuthSessionSchema.setClass(AuthSession);
