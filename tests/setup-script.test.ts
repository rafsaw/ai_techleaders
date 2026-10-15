import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runSetup } from "../scripts/setup/run.mjs";
import {
  MIN_NODE,
  StepError,
  createContext,
  exec,
  hasEnvDatabaseUrl,
  nodeSatisfies,
  prerequisites,
  steps,
} from "../scripts/setup/steps.mjs";

vi.mock("node:child_process", () => ({ spawnSync: vi.fn() }));

const spawn = vi.mocked(spawnSync);
const ROOT = "/repo";
const SECRET_URL = "postgres://user:s3cret@db.example:5432/app";

type Ctx = { env: Record<string, string | undefined>; nodeVersion: string; root: string };

function ctx(overrides: Partial<Ctx> = {}): Ctx {
  return { env: {}, nodeVersion: "22.23.3", root: ROOT, ...overrides };
}

type SpawnResult = { status?: number | null; stdout?: string | null; error?: Error };

// Answers each spawned command by its "command arg arg" key; unknown commands succeed.
function respond(results: Record<string, SpawnResult> = {}) {
  spawn.mockImplementation(((command: string, args: readonly string[]) => {
    const result = results[[command, ...args].join(" ")] ?? {};
    return { status: 0, stdout: "", ...result };
  }) as unknown as typeof spawnSync);
}

function spawned() {
  return spawn.mock.calls.map(([command, args]) => [command, ...(args ?? [])].join(" "));
}

function captureLog() {
  const lines: string[] = [];
  return { lines, log: (line: string) => lines.push(line) };
}

afterEach(() => {
  process.exitCode = undefined;
});

describe("runSetup", () => {
  it("runs pending steps, skips done ones, and prints the next command", () => {
    const action = vi.fn();
    const { lines, log } = captureLog();
    const code = runSetup(
      [
        { name: "A", check: () => null, action },
        { name: "B", check: () => "already there", action: vi.fn() },
      ],
      ctx(),
      log,
    );
    expect(code).toBe(0);
    expect(action).toHaveBeenCalledOnce();
    expect(lines).toEqual(["✔ A — done", "↷ B — skipped (already there)", "Next: npm run dev"]);
  });

  it("stops at the first failing step and names its fix", () => {
    const later = vi.fn();
    const { lines, log } = captureLog();
    const code = runSetup(
      [
        {
          name: "A",
          check: () => null,
          action: () => {
            throw new StepError("broke", "fix it");
          },
        },
        { name: "B", check: () => null, action: later },
      ],
      ctx(),
      log,
    );
    expect(code).toBe(1);
    expect(later).not.toHaveBeenCalled();
    expect(lines).toEqual(["✖ A — failed: broke → fix it"]);
  });

  it("reports unexpected errors, including ones thrown by a check, with a generic fix", () => {
    const { lines, log } = captureLog();
    const code = runSetup(
      [
        {
          name: "A",
          check: () => {
            throw new Error("boom");
          },
          action: vi.fn(),
        },
      ],
      ctx(),
      log,
    );
    expect(code).toBe(1);
    expect(lines).toEqual(["✖ A — failed: boom → see the output above and re-run npm run setup"]);
  });
});

describe("helpers", () => {
  it("builds the context from the running process and the repo root", () => {
    const context = createContext();
    expect(context.env).toBe(process.env);
    expect(context.nodeVersion).toBe(process.versions.node);
    expect(context.root).toBe(fileURLToPath(new URL("..", import.meta.url)).replace(/\/$/, ""));
  });

  it("treats only a non-empty DATABASE_URL in the process env as set", () => {
    expect(hasEnvDatabaseUrl(ctx({ env: { DATABASE_URL: SECRET_URL } }))).toBe(true);
    expect(hasEnvDatabaseUrl(ctx({ env: { DATABASE_URL: "" } }))).toBe(false);
    expect(hasEnvDatabaseUrl(ctx())).toBe(false);
  });

  it("compares Node versions numerically", () => {
    expect(nodeSatisfies("22.17.0", MIN_NODE)).toBe(true);
    expect(nodeSatisfies("22.23.3", MIN_NODE)).toBe(true);
    expect(nodeSatisfies("24.0.0", MIN_NODE)).toBe(true);
    expect(nodeSatisfies("22.16.9", MIN_NODE)).toBe(false);
    expect(nodeSatisfies("20.19.0", MIN_NODE)).toBe(false);
  });

  it("streams output by default and runs in the repo root", () => {
    spawn.mockReturnValue({ status: 0, stdout: null } as never);
    expect(exec("npm", ["install"], ctx())).toEqual({ ok: true, stdout: "" });
    expect(spawn).toHaveBeenCalledWith("npm", ["install"], { cwd: ROOT, encoding: "utf8", stdio: "inherit" });
  });

  it("captures stdout when asked and reports exit failures", () => {
    spawn.mockReturnValue({ status: 2, stdout: "out" } as never);
    expect(exec("docker", ["info"], ctx(), true)).toEqual({ ok: false, stdout: "out" });
    expect(spawn).toHaveBeenCalledWith("docker", ["info"], { cwd: ROOT, encoding: "utf8", stdio: "pipe" });
  });

  it("reports a command that cannot be spawned as failed", () => {
    spawn.mockReturnValue({ status: null, stdout: null, error: new Error("ENOENT") } as never);
    expect(exec("docker", ["info"], ctx(), true)).toEqual({ ok: false, stdout: "" });
  });
});

describe("Prerequisites step", () => {
  it("always runs", () => {
    expect(prerequisites.check()).toBeNull();
    expect(steps[0]).toBe(prerequisites);
  });

  it("passes with a supported Node and a working Docker", () => {
    respond();
    expect(() => prerequisites.action(ctx())).not.toThrow();
    expect(spawned()).toEqual(["docker info", "docker compose version"]);
  });

  it("rejects an old Node before checking anything else", () => {
    respond();
    expect(() => prerequisites.action(ctx({ nodeVersion: "22.16.0" }))).toThrow(
      expect.objectContaining({ message: `Node 22.16.0 is older than ${MIN_NODE}`, fix: `install Node ≥ ${MIN_NODE}` }),
    );
    expect(spawn).not.toHaveBeenCalled();
  });

  it("fails when the Docker daemon is unavailable and suggests DATABASE_URL", () => {
    respond({ "docker info": { status: 1 } });
    expect(() => prerequisites.action(ctx())).toThrow(
      expect.objectContaining({ message: expect.stringContaining("`docker info` failed"), fix: expect.stringContaining("export DATABASE_URL") }),
    );
    expect(spawned()).toEqual(["docker info"]);
  });

  it("fails when the Compose plugin is missing", () => {
    respond({ "docker compose version": { status: 1 } });
    expect(() => prerequisites.action(ctx())).toThrow(expect.objectContaining({ message: expect.stringContaining("`docker compose version` failed") }));
  });

  it("skips the Docker checks when DATABASE_URL is set", () => {
    respond({ "docker info": { status: 1 } });
    expect(() => prerequisites.action(ctx({ env: { DATABASE_URL: SECRET_URL } }))).not.toThrow();
    expect(spawn).not.toHaveBeenCalled();
  });
});

describe("setup entry", () => {
  it("runs every step with the process context and sets the exit code", async () => {
    vi.resetModules();
    const runSetupMock = vi.fn(() => 1);
    vi.doMock("../scripts/setup/run.mjs", () => ({ runSetup: runSetupMock }));
    await import("../scripts/setup.mjs");
    const stepsModule = await import("../scripts/setup/steps.mjs");
    expect(runSetupMock).toHaveBeenCalledWith(stepsModule.steps, expect.objectContaining({ env: process.env }), console.log);
    expect(process.exitCode).toBe(1);
    vi.doUnmock("../scripts/setup/run.mjs");
  });
});
