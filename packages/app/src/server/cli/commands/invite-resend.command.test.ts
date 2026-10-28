import type { Cradle } from "@devmentor/core";
import { describe, expect, it, vi } from "vitest";

import { InvitationEmailNotSentError, parseInviteFlags } from "@/server/cli/commands/invite-flags";
import { inviteResendCommand } from "@/server/cli/commands/invite-resend.command";

function setup(emailSent: boolean) {
  const resend = vi.fn().mockResolvedValue({
    id: "inv-1", email: "ada@example.com", expiresAt: new Date("2026-11-11T12:00:00.000Z"), emailSent,
  });
  const cradle = { mentorInvitationService: { resend } } as unknown as Cradle;
  return { cradle, resend, out: { info: vi.fn(), error: vi.fn() } };
}

describe("invite resend", () => {
  it("is named, documented and parses the shared invite flags", () => {
    expect(inviteResendCommand.name).toBe("invite resend");
    expect(inviteResendCommand.summary).toMatch(/previous link stops working/);
    expect(inviteResendCommand.parse).toBe(parseInviteFlags);
  });

  it("resends and prints the new expiry and delivery", async () => {
    const t = setup(true);
    await inviteResendCommand.run(t.cradle, { email: "ada@example.com" }, t.out);
    expect(t.resend).toHaveBeenCalledWith({ email: "ada@example.com" });
    expect(t.out.info.mock.calls).toEqual([
      ["Invitation resent: id inv-1, email ada@example.com, expires 2026-11-11T12:00:00.000Z."],
      ["Delivery: email accepted by the mail server."],
    ]);
  });

  it("fails when the email was not sent", async () => {
    const t = setup(false);
    await expect(inviteResendCommand.run(t.cradle, { email: "ada@example.com" }, t.out)).rejects.toBeInstanceOf(InvitationEmailNotSentError);
  });
});
