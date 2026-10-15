import { spawnSync } from "node:child_process";
import { constants, copyFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runSetup } from "../scripts/setup/run.mjs";
import {
  MIN_NODE,
  StepError,
  ENV_REASON,
  createContext,
  dependencies,
  env,
  exec,
  hasEnvDatabaseUrl,
  migrations,
  newestManifestMtime,
  nodeSatisfies,
  postgres,
  postgresHealthy,
  prerequisites,
  steps,
} from "../scripts/setup/steps.mjs";

vi.mock("node:child_process", () => ({ spawnSync: vi.fn() }));
vi.mock("node:fs", () => ({
  constants: { COPYFILE_EXCL: 1 },
  copyFileSync: vi.fn(),
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
  statSync: vi.fn(),
}));

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

// A fake repo: file path (relative to ROOT) → mtime in ms.
function files(mtimes: Record<string, number>, packageDirs = ["app", "core"]) {
  const abs = (path: string) => path.slice(ROOT.length + 1);
  vi.mocked(existsSync).mockImplementation((path) => abs(String(path)) in mtimes);
  vi.mocked(statSync).mockImplementation(((path: string) => {
    const mtimeMs = mtimes[abs(String(path))];
    if (mtimeMs === undefined) throw new Error(`ENOENT: ${String(path)}`);
    return { mtimeMs };
  }) as unknown as typeof statSync);
  vi.mocked(readdirSync).mockReturnValue([
    ...packageDirs.map((name) => ({ name, isDirectory: () => true })),
    { name: "README.md", isDirectory: () => false },
  ] as never);
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
  it("always runs, first", () => {
    expect(prerequisites.check()).toBeNull();
    expect(steps.map((step: { name: string }) => step.name)).toEqual(["Prerequisites", "Dependencies", "PostgreSQL", "Env", "Migrations"]);
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

describe("Dependencies step", () => {
  const installed = {
    "package-lock.json": 100,
    "package.json": 90,
    "packages/app/package.json": 80,
    "packages/core/package.json": 80,
    "node_modules/.package-lock.json": 140,
  };

  it("takes the newest of the lockfile and every workspace package.json", () => {
    files({ ...installed, "packages/core/package.json": 150 });
    expect(newestManifestMtime(ctx())).toBe(150);
    expect(readdirSync).toHaveBeenCalledWith(`${ROOT}/packages`, { withFileTypes: true });
  });

  it("ignores manifests that do not exist", () => {
    files({ "package.json": 90 }, ["app"]);
    expect(newestManifestMtime(ctx())).toBe(90);
  });

  it("skips when node_modules is newer than every manifest", () => {
    files(installed);
    expect(dependencies.check(ctx())).toBe("node_modules is up to date");
  });

  it("installs when node_modules is missing", () => {
    files({ "package-lock.json": 100 });
    expect(dependencies.check(ctx())).toBeNull();
  });

  it("installs when the lockfile changed after the last install", () => {
    files({ ...installed, "package-lock.json": 200 });
    expect(dependencies.check(ctx())).toBeNull();
  });

  it("installs when a workspace package.json changed after the last install", () => {
    files({ ...installed, "packages/app/package.json": 200 });
    expect(dependencies.check(ctx())).toBeNull();
  });

  it("runs npm install with visible output", () => {
    respond();
    dependencies.action(ctx());
    expect(spawn).toHaveBeenCalledWith("npm", ["install"], expect.objectContaining({ stdio: "inherit" }));
  });

  it("fails when npm install fails", () => {
    respond({ "npm install": { status: 1 } });
    expect(() => dependencies.action(ctx())).toThrow(expect.objectContaining({ message: "`npm install` failed" }));
  });
});

describe("PostgreSQL step", () => {
  const healthy = { Service: "postgres", Health: "healthy" };

  it("reads the JSON array printed by older Compose versions", () => {
    expect(postgresHealthy(JSON.stringify([{ Service: "other", Health: "healthy" }, healthy]))).toBe(true);
  });

  it("reads the one-object-per-line output of newer Compose versions", () => {
    expect(postgresHealthy(`${JSON.stringify({ Service: "other" })}\n${JSON.stringify(healthy)}\n`)).toBe(true);
  });

  it("is not healthy while starting, when absent, or when output is not JSON", () => {
    expect(postgresHealthy(JSON.stringify({ Service: "postgres", Health: "starting" }))).toBe(false);
    expect(postgresHealthy(JSON.stringify({ Service: "other", Health: "healthy" }))).toBe(false);
    expect(postgresHealthy("")).toBe(false);
    expect(postgresHealthy("no configuration file provided")).toBe(false);
  });

  it("skips when the container is healthy", () => {
    respond({ "docker compose ps --format json": { stdout: JSON.stringify(healthy) } });
    expect(postgres.check(ctx())).toBe("postgres container is healthy");
  });

  it("starts the container when it is not healthy or compose ps fails", () => {
    respond({ "docker compose ps --format json": { stdout: "" } });
    expect(postgres.check(ctx())).toBeNull();
    respond({ "docker compose ps --format json": { status: 1, stdout: JSON.stringify(healthy) } });
    expect(postgres.check(ctx())).toBeNull();
  });

  it("skips Docker entirely when DATABASE_URL is set, without printing the URL", () => {
    respond();
    const { lines, log } = captureLog();
    expect(runSetup([postgres], ctx({ env: { DATABASE_URL: SECRET_URL } }), log)).toBe(0);
    expect(lines[0]).toBe(`↷ PostgreSQL — skipped (${ENV_REASON})`);
    expect(lines.join("\n")).not.toContain("s3cret");
    expect(spawn).not.toHaveBeenCalled();
  });

  it("starts the container and waits for its healthcheck", () => {
    respond();
    postgres.action(ctx());
    expect(spawned()).toEqual(["docker compose up -d --wait"]);
  });

  it("fails with a port hint when compose up fails", () => {
    respond({ "docker compose up -d --wait": { status: 1 } });
    expect(() => postgres.action(ctx())).toThrow(expect.objectContaining({ fix: expect.stringContaining("port 5432") }));
  });
});

describe("Env step", () => {
  it("skips when packages/app/.env exists", () => {
    files({ "packages/app/.env": 1 });
    expect(env.check(ctx())).toBe("packages/app/.env exists");
  });

  it("creates .env when it is missing", () => {
    files({});
    expect(env.check(ctx())).toBeNull();
  });

  it("skips without touching files when DATABASE_URL is set", () => {
    files({});
    expect(env.check(ctx({ env: { DATABASE_URL: SECRET_URL } }))).toBe(ENV_REASON);
    expect(existsSync).not.toHaveBeenCalled();
  });

  it("copies the template without ever overwriting", () => {
    files({ "packages/app/.env.example": 1 });
    env.action(ctx());
    expect(copyFileSync).toHaveBeenCalledWith(`${ROOT}/packages/app/.env.example`, `${ROOT}/packages/app/.env`, constants.COPYFILE_EXCL);
  });

  it("fails when the template is missing", () => {
    files({});
    expect(() => env.action(ctx())).toThrow(expect.objectContaining({ message: "packages/app/.env.example not found" }));
    expect(copyFileSync).not.toHaveBeenCalled();
  });
});

describe("Migrations step", () => {
  const pendingCommand = "npm run -s migration:pending -w @devmentor/db";

  it("skips when nothing is pending", () => {
    respond({ [pendingCommand]: { stdout: "No pending migrations\n" } });
    expect(migrations.check(ctx())).toBe("no pending migrations");
    expect(spawn).toHaveBeenCalledWith("npm", ["run", "-s", "migration:pending", "-w", "@devmentor/db"], expect.objectContaining({ stdio: "pipe" }));
  });

  it("migrates when migrations are pending", () => {
    respond({ [pendingCommand]: { stdout: "Migration20261101000000\n" } });
    expect(migrations.check(ctx())).toBeNull();
  });

  it("migrates when the database is unreachable, since migration:pending still exits 0", () => {
    respond({ [pendingCommand]: { status: 0, stdout: "" } });
    expect(migrations.check(ctx())).toBeNull();
  });

  it("runs db:migrate with visible output", () => {
    respond();
    migrations.action(ctx());
    expect(spawned()).toEqual(["npm run db:migrate"]);
  });

  it("fails with a DATABASE_URL hint when migrating fails", () => {
    respond({ "npm run db:migrate": { status: 1 } });
    expect(() => migrations.action(ctx())).toThrow(expect.objectContaining({ fix: expect.stringContaining("DATABASE_URL") }));
  });
});

describe("full setup", () => {
  const healthyPs = JSON.stringify({ Service: "postgres", Health: "healthy" });
  const done = {
    "package-lock.json": 100,
    "package.json": 90,
    "packages/app/package.json": 80,
    "packages/core/package.json": 80,
    "node_modules/.package-lock.json": 140,
    "packages/app/.env": 1,
    "packages/app/.env.example": 1,
  };

  it("skips every step on a ready repo and exits 0", () => {
    files(done);
    respond({
      "docker compose ps --format json": { stdout: healthyPs },
      "npm run -s migration:pending -w @devmentor/db": { stdout: "No pending migrations" },
    });
    const { lines, log } = captureLog();
    expect(runSetup(steps, ctx(), log)).toBe(0);
    expect(lines).toEqual([
      "✔ Prerequisites — done",
      "↷ Dependencies — skipped (node_modules is up to date)",
      "↷ PostgreSQL — skipped (postgres container is healthy)",
      "↷ Env — skipped (packages/app/.env exists)",
      "↷ Migrations — skipped (no pending migrations)",
      "Next: npm run dev",
    ]);
    expect(spawned()).not.toContain("npm install");
  });

  it("re-runs only the step that is no longer done", () => {
    const withoutEnv: Record<string, number> = { ...done };
    delete withoutEnv["packages/app/.env"];
    files(withoutEnv);
    respond({
      "docker compose ps --format json": { stdout: healthyPs },
      "npm run -s migration:pending -w @devmentor/db": { stdout: "No pending migrations" },
    });
    const { lines, log } = captureLog();
    expect(runSetup(steps, ctx(), log)).toBe(0);
    expect(lines.filter((line) => line.startsWith("✔"))).toEqual(["✔ Prerequisites — done", "✔ Env — done"]);
  });

  it("uses the environment's database without Docker or .env and never prints the URL", () => {
    files(done);
    respond({ "npm run -s migration:pending -w @devmentor/db": { stdout: "" } });
    const { lines, log } = captureLog();
    expect(runSetup(steps, ctx({ env: { DATABASE_URL: SECRET_URL } }), log)).toBe(0);
    expect(spawned()).toEqual(["npm run -s migration:pending -w @devmentor/db", "npm run db:migrate"]);
    expect(lines).toContain(`↷ Env — skipped (${ENV_REASON})`);
    expect(lines.join("\n")).not.toContain("s3cret");
  });

  it("names the failing step without printing DATABASE_URL when migrating fails", () => {
    files(done);
    respond({ "npm run db:migrate": { status: 1 } });
    const { lines, log } = captureLog();
    expect(runSetup(steps, ctx({ env: { DATABASE_URL: SECRET_URL } }), log)).toBe(1);
    expect(lines.at(-1)).toMatch(/^✖ Migrations — failed: `npm run db:migrate` failed → check DATABASE_URL/);
    expect(lines.join("\n")).not.toContain("s3cret");
  });
});

describe("setup entry", () => {
  it("runs every step with the process context and sets the exit code", async () => {
    vi.resetModules();
    const runSetupMock = vi.fn(() => 1);
    vi.doMock("../scripts/setup/run.mjs", () => ({ runSetup: runSetupMock }));
    try {
      await import("../scripts/setup.mjs");
      const stepsModule = await import("../scripts/setup/steps.mjs");
      expect(runSetupMock).toHaveBeenCalledWith(stepsModule.steps, expect.objectContaining({ env: process.env }), console.log);
      expect(process.exitCode).toBe(1);
    } finally {
      vi.doUnmock("../scripts/setup/run.mjs");
    }
  });
});
