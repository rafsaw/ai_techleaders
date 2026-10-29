import type { OperatorCommand } from "@/server/cli/run-cli";
import {
  INVITE_OPTIONS,
  INVITE_USAGE,
  parseInviteFlags,
  reportDelivery,
  type InviteFlags,
} from "@/server/cli/commands/invite-flags";

/** `invite resend --email <e>`: new link and 14-day expiry for the open invitation; the old link stops working. */
export const inviteResendCommand: OperatorCommand<InviteFlags> = {
  name: "invite resend",
  summary: "Email a new link for the open invitation (new 14-day expiry; the previous link stops working).",
  usage: INVITE_USAGE,
  options: INVITE_OPTIONS,
  parse: parseInviteFlags,
  async run({ mentorInvitationService }, { email }, out) {
    reportDelivery("resent", await mentorInvitationService.resend({ email }), out);
  },
};
