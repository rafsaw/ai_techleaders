import type { Cradle } from "@devmentor/core";
import { describe, expect, it, vi } from "vitest";

import { parseInviteFlags } from "@/server/cli/commands/invite-flags";
import { inviteRevokeCommand } from "@/server/cli/commands/invite-revoke.command";
import type { InvitationRevokeDto } from "@/server/services/auth/mentor-invitation.service";

async function run(result: InvitationRevokeDto) {
  const revoke = vi.fn().mockResolvedValue(result);
  const cradle = { mentorInvitationService: { revoke } } as unknown as Cradle;
  const out = { info: vi.fn(), error: vi.fn() };
  await inviteRevokeCommand.run(cradle, { email: "ada@example.com" }, out);
  expect(revoke).toHaveBeenCalledWith({ email: "ada@example.com" });
  expect(out.error).not.toHaveBeenCalled();
  return out.info.mock.calls.map(([line]) => line as string);
}

describe("invite revoke", () => {
  it("is named, documented and parses the shared invite flags", () => {
    expect(inviteRevokeCommand.name).toBe("invite revoke");
    expect(inviteRevokeCommand.summary).toMatch(/does not remove a granted mentor role/);
    expect(inviteRevokeCommand.parse).toBe(parseInviteFlags);
  });

  it("reports the revoked invitation", async () => {
    expect(await run({ outcome: "revoked", id: "inv-1", email: "ada@example.com" }))
      .toEqual(["Invitation revoked: id inv-1, email ada@example.com. Its link no longer works."]);
  });

  it("is an idempotent no-op without an open invitation", async () => {
    expect(await run({ outcome: "none", email: "ada@example.com" }))
      .toEqual(["ada@example.com has no open invitation; nothing changed."]);
  });

  it("reports that the latest invitation was already accepted and the role stays", async () => {
    expect(await run({ outcome: "already-accepted", id: "inv-1", email: "ada@example.com", acceptedAt: new Date("2026-10-20T09:00:00Z") }))
      .toEqual([
        "ada@example.com has no open invitation; nothing changed. The latest invitation (id inv-1) was accepted on " +
          "2026-10-20T09:00:00.000Z; revoking does not remove the mentor role.",
      ]);
  });
});
