import type { OperatorCommand } from "@/server/cli/run-cli";
import { parseRoleFlags, ROLE_OPTIONS, ROLE_USAGE, type RoleFlags } from "@/server/cli/commands/role-flags";

/** `role grant --email <e> --role operator`: idempotent, live on the next request. */
export const roleGrantCommand: OperatorCommand<RoleFlags> = {
  name: "role grant",
  summary: "Grant the operator role to an existing account (applies on its next request).",
  usage: ROLE_USAGE,
  options: ROLE_OPTIONS,
  parse: parseRoleFlags,
  async run({ userService, roleService }, { email, role }, out) {
    const user = await userService.findByEmail(email);
    const added = await roleService.grant(user.id, role);
    out.info(added ? `Granted ${role} to ${email}.` : `${email} already holds ${role}; nothing changed.`);
  },
};
