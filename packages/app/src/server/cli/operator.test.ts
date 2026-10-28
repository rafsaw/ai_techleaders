import { afterEach, describe, expect, it, vi } from "vitest";

const { main, defaultDeps } = vi.hoisted(() => ({ main: vi.fn(), defaultDeps: { marker: "deps" } }));
vi.mock("@/server/cli/run-cli", () => ({ main, defaultDeps }));

afterEach(() => { process.exitCode = undefined; });

describe("operator entry", () => {
  it("passes argv after the script, the process env and the real deps to main, and sets the exit code", async () => {
    main.mockResolvedValue(2);
    const argv = process.argv;
    process.argv = ["node", "operator.ts", "role", "grant"];
    try {
      await import("@/server/cli/operator");
    } finally {
      process.argv = argv;
    }
    expect(main).toHaveBeenCalledWith(["role", "grant"], process.env, defaultDeps);
    expect(process.exitCode).toBe(2);
  });
});
