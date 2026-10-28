import type { OperatorCommand } from "@/server/cli/run-cli";
import { INVITE_OPTIONS, INVITE_USAGE, parseInviteFlags, type InviteFlags } from "@/server/cli/commands/invite-flags";

/** `invite revoke --email <e>`: idempotent; never removes a mentor role already granted. */
export const inviteRevokeCommand: OperatorCommand<InviteFlags> = {
  name: "invite revoke",
  summary: "Revoke the open invitation so its link stops working (does not remove a granted mentor role).",
  usage: INVITE_USAGE,
  options: INVITE_OPTIONS,
  parse: parseInviteFlags,
  async run({ mentorInvitationService }, { email }, out) {
    const result = await mentorInvitationService.revoke({ email });
    if (result.outcome === "revoked") {
      out.info(`Invitation revoked: id ${result.id}, email ${email}. Its link no longer works.`);
    } else if (result.outcome === "already-accepted") {
      out.info(
        `${email} has no open invitation; nothing changed. The latest invitation (id ${result.id}) was accepted ` +
          `on ${result.acceptedAt.toISOString()}; revoking does not remove the mentor role.`,
      );
    } else {
      out.info(`${email} has no open invitation; nothing changed.`);
    }
  },
};
