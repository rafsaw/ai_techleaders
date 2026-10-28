import type { Cradle } from "@devmentor/core";
import { describe, expect, it, vi } from "vitest";

import { parseRoleFlags } from "@/server/cli/commands/role-flags";
import { roleGrantCommand } from "@/server/cli/commands/role-grant.command";

function setup(added: boolean) {
  const cradle = {
    userService: { findByEmail: vi.fn().mockResolvedValue({ id: "u-1" }) },
    roleService: { grant: vi.fn().mockResolvedValue(added) },
  } as unknown as Cradle;
  const out = { info: vi.fn(), error: vi.fn() };
  return { cradle, out };
}

describe("role grant", () => {
  it("is named, documented and parses the shared role flags", () => {
    expect(roleGrantCommand.name).toBe("role grant");
    expect(roleGrantCommand.summary).toMatch(/next request/);
    expect(roleGrantCommand.parse).toBe(parseRoleFlags);
  });

  it("grants operator to the account with that email", async () => {
    const { cradle, out } = setup(true);
    await roleGrantCommand.run(cradle, { email: "ada@example.com", role: "operator" }, out);
    expect(cradle.userService.findByEmail).toHaveBeenCalledWith("ada@example.com");
    expect(cradle.roleService.grant).toHaveBeenCalledWith("u-1", "operator");
    expect(out.info).toHaveBeenCalledWith("Granted operator to ada@example.com.");
  });

  it("is idempotent", async () => {
    const { cradle, out } = setup(false);
    await roleGrantCommand.run(cradle, { email: "ada@example.com", role: "operator" }, out);
    expect(out.info).toHaveBeenCalledWith("ada@example.com already holds operator; nothing changed.");
  });
});
