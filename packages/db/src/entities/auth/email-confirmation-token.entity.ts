import { defineEntity, p } from "@mikro-orm/core";

import { baseProperties } from "../base";
import { singleUseTokenProperties } from "../single-use-token";
import { User } from "./user.entity";

const EmailConfirmationTokenSchema = defineEntity({
  name: "EmailConfirmationToken",
  tableName: "email_confirmation_tokens",
  properties: {
    ...baseProperties,
    ...singleUseTokenProperties,
    /** Indexed: registration and resend delete a user's older links. */
    user: () => p.manyToOne(User).deleteRule("cascade").index(),
    /** The address the link was sent to; a confirmation applies only while it still equals `users.email`. */
    email: p.string().length(254),
  },
});

/** One email confirmation link (platform P9). Read and consume only through the single-use token helpers. */
export class EmailConfirmationToken extends EmailConfirmationTokenSchema.class {}
EmailConfirmationTokenSchema.setClass(EmailConfirmationToken);
