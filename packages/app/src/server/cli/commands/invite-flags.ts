import { AppError, ValidationError } from "@devmentor/core";
import { emailSchema } from "@devmentor/core/validators/auth/email.schema";
import type { ParseArgsOptionsConfig } from "node:util";

import type { ParsedValues } from "@/server/cli/run-cli";
import { INVITATION_LIFETIME_DAYS } from "@/server/services/auth/mentor-invitation.policy";
// Type only: the service imports `@devmentor/db`, which must not load before env.
import type { InvitationDeliveryDto } from "@/server/services/auth/mentor-invitation.service";

/** Flags shared by `invite create`, `invite revoke` and `invite resend`. */
export interface InviteFlags {
  email: string;
}

/**
 * `--email` is the only input. `--note` and `--expires-in-days` are declared
 * only so they are refused with a reason (accounts AD5) instead of the
 * runner's generic "unknown option".
 */
export const INVITE_OPTIONS = {
  email: { type: "string" },
  note: { type: "string" },
  "expires-in-days": { type: "string" },
} satisfies ParseArgsOptionsConfig;

export const INVITE_USAGE = "--email <email>";

function refuse(field: string, message: string): never {
  throw new ValidationError({ [field]: [message] }, message);
}

/** Normalizes `--email` with the account email rules (trimmed, lowercased, valid). */
export function parseInviteFlags(values: ParsedValues): InviteFlags {
  if (values.note !== undefined) refuse("note", "--note is not supported: invitations carry no note.");
  if (values["expires-in-days"] !== undefined) {
    refuse("expires-in-days", `--expires-in-days is not supported: invitations always expire after ${INVITATION_LIFETIME_DAYS} days.`);
  }
  const email = emailSchema.safeParse(values.email);
  if (!email.success) refuse("email", "--email must be a valid email address.");
  return { email: email.data };
}

/**
 * The invitation was committed but its email was not sent. The runner prints
 * the message on stderr and exits nonzero; the operator's remedy is resend.
 */
export class InvitationEmailNotSentError extends AppError {
  constructor(message: string) {
    super(message, "email_not_sent", 502);
  }
}

/** The command that sends a new link to `email`. */
export function resendCommandLine(email: string): string {
  return `npm run operator -- invite resend --email ${email}`;
}

/**
 * Prints the safe status of a create or resend (id, email, expiry, delivery;
 * never the token or link) and throws when the email was not sent.
 */
export function reportDelivery(
  verb: "created" | "resent",
  result: InvitationDeliveryDto,
  out: { info(message: string): void },
): void {
  out.info(`Invitation ${verb}: id ${result.id}, email ${result.email}, expires ${result.expiresAt.toISOString()}.`);
  if (result.emailSent) {
    out.info("Delivery: email accepted by the mail server.");
    return;
  }
  const previous = verb === "resent" ? " Its previous link no longer works." : "";
  throw new InvitationEmailNotSentError(
    `Delivery: failed, the invitation email was not sent. The invitation is saved.${previous} Send a new link with: ${resendCommandLine(result.email)}`,
  );
}
