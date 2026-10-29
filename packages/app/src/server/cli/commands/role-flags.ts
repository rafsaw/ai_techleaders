import { ValidationError } from "@devmentor/core";
import type { ParseArgsOptionsConfig } from "node:util";
import { z } from "zod";

import type { ParsedValues } from "@/server/cli/run-cli";

/** Flags shared by `role grant` and `role revoke`. */
export interface RoleFlags {
  email: string;
  role: "operator";
}

export const ROLE_OPTIONS = {
  email: { type: "string" },
  role: { type: "string" },
} satisfies ParseArgsOptionsConfig;

export const ROLE_USAGE = "--email <email> --role operator";

const emailSchema = z.string().trim().toLowerCase().max(254).pipe(z.email());

function refuse(field: string, message: string): never {
  throw new ValidationError({ [field]: [message] }, message);
}

/**
 * Only `operator` is accepted: `mentor` comes solely from accepting an
 * email-bound invitation (accounts AD5), and `mentee` is granted on sign-up.
 */
export function parseRoleFlags(values: ParsedValues): RoleFlags {
  const email = emailSchema.safeParse(values.email);
  if (!email.success) refuse("email", "--email must be a valid email address.");
  if (values.role === "mentor") {
    refuse("role", "The mentor role is granted only by accepting an invitation.");
  }
  if (values.role !== "operator") refuse("role", "--role must be operator.");
  return { email: email.data, role: "operator" };
}
