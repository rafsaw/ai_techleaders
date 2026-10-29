import type { Cradle } from "@devmentor/core";
import { describe, expect, it, vi } from "vitest";

import { parseRoleFlags } from "@/server/cli/commands/role-flags";
import { roleRevokeCommand } from "@/server/cli/commands/role-revoke.command";

function setup(removed: boolean) {
  const cradle = {
    userService: { findByEmail: vi.fn().mockResolvedValue({ id: "u-1" }) },
    roleService: { revokeOperator: vi.fn().mockResolvedValue(removed) },
  } as unknown as Cradle;
  const out = { info: vi.fn(), error: vi.fn() };
  return { cradle, out };
}

describe("role revoke", () => {
  it("is named, documented and parses the shared role flags", () => {
    expect(roleRevokeCommand.name).toBe("role revoke");
    expect(roleRevokeCommand.summary).toMatch(/stay signed in/);
    expect(roleRevokeCommand.parse).toBe(parseRoleFlags);
  });

  it("revokes operator from the account with that email", async () => {
    const { cradle, out } = setup(true);
    await roleRevokeCommand.run(cradle, { email: "ada@example.com", role: "operator" }, out);
    expect(cradle.roleService.revokeOperator).toHaveBeenCalledWith("u-1");
    expect(out.info).toHaveBeenCalledWith("Revoked operator from ada@example.com.");
  });

  it("is idempotent", async () => {
    const { cradle, out } = setup(false);
    await roleRevokeCommand.run(cradle, { email: "ada@example.com", role: "operator" }, out);
    expect(out.info).toHaveBeenCalledWith("ada@example.com does not hold operator; nothing changed.");
  });
});
