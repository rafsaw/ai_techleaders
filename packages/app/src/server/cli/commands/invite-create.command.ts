import type { OperatorCommand } from "@/server/cli/run-cli";
import {
  INVITE_OPTIONS,
  INVITE_USAGE,
  parseInviteFlags,
  reportDelivery,
  type InviteFlags,
} from "@/server/cli/commands/invite-flags";

/** `invite create --email <e>`: one open invitation per address, valid 14 days, emailed after commit. */
export const inviteCreateCommand: OperatorCommand<InviteFlags> = {
  name: "invite create",
  summary: "Email a mentor invitation to this address (valid 14 days; only a verified account with it can accept).",
  usage: INVITE_USAGE,
  options: INVITE_OPTIONS,
  parse: parseInviteFlags,
  async run({ mentorInvitationService }, { email }, out) {
    reportDelivery("created", await mentorInvitationService.create({ email }), out);
  },
};
