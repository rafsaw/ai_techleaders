import type { OperatorCommand } from "@/server/cli/run-cli";
import { parseRoleFlags, ROLE_OPTIONS, ROLE_USAGE, type RoleFlags } from "@/server/cli/commands/role-flags";

/** `role revoke --email <e> --role operator`: idempotent; sessions stay signed in. */
export const roleRevokeCommand: OperatorCommand<RoleFlags> = {
  name: "role revoke",
  summary: "Revoke the operator role (applies on its next request; sessions stay signed in).",
  usage: ROLE_USAGE,
  options: ROLE_OPTIONS,
  parse: parseRoleFlags,
  async run({ userService, roleService }, { email, role }, out) {
    const user = await userService.findByEmail(email);
    const removed = await roleService.revokeOperator(user.id);
    out.info(removed ? `Revoked ${role} from ${email}.` : `${email} does not hold ${role}; nothing changed.`);
  },
};
