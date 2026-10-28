import { fileURLToPath } from "node:url";

import { asValue, createAppContainer, NotFoundError, type Cradle } from "@devmentor/core";
import { afterEach, describe, expect, it, vi } from "vitest";

import { roleGrantCommand } from "@/server/cli/commands/role-grant.command";
import { roleRevokeCommand } from "@/server/cli/commands/role-revoke.command";
import { databaseHost, defaultDeps, EXIT, main, type CliDeps } from "@/server/cli/run-cli";

const { loadEnvConfig, fakeContainerModule } = vi.hoisted(() => ({
  loadEnvConfig: vi.fn(),
  fakeContainerModule: { container: { marker: "container" }, createRequestScope: () => ({}) },
}));
vi.mock("@next/env", () => ({ default: { loadEnvConfig } }));
vi.mock("@/server/container", () => fakeContainerModule);

const DB = "postgres://devmentor:s3cret@db.internal:5432/devmentor";
const GRANT = ["role", "grant", "--email", "Ada@Example.com", "--role", "operator"];

function setup({ grant = vi.fn().mockResolvedValue(true), findByEmail = vi.fn().mockResolvedValue({ id: "u-1" }) } = {}) {
  const container = createAppContainer();
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const roleService = { grant, revokeOperator: vi.fn().mockResolvedValue(true) };
  container.register({
    logger: asValue(logger),
    roleService: asValue(roleService as unknown as Cradle["roleService"]),
    userService: asValue({ findByEmail } as unknown as Cradle["userService"]),
  });
  const dispose = vi.spyOn(container, "dispose");
  const info: string[] = [];
  const error: string[] = [];
  const order: string[] = [];
  const deps: CliDeps = {
    commands: [roleGrantCommand, roleRevokeCommand],
    output: { info: (m) => { info.push(m); }, error: (m) => { error.push(m); } },
    loadEnv: vi.fn(() => { order.push("env"); }),
    loadContainer: vi.fn(async () => {
      order.push("container");
      return { container, createRequestScope: () => container.createScope() };
    }),
  };
  return { deps, info, error, order, logger, roleService, findByEmail, dispose };
}

afterEach(() => vi.clearAllMocks());

describe("operator CLI main", () => {
  it("grants operator: loads env first, prints the DB host without credentials, disposes", async () => {
    const t = setup();
    await expect(main(GRANT, { DATABASE_URL: DB }, t.deps)).resolves.toBe(EXIT.ok);
    expect(t.order).toEqual(["env", "container"]);
    expect(t.info).toEqual(["Database: db.internal:5432", "Granted operator to ada@example.com."]);
    expect(t.info.join("\n")).not.toContain("s3cret");
    expect(t.findByEmail).toHaveBeenCalledWith("ada@example.com");
    expect(t.roleService.grant).toHaveBeenCalledWith("u-1", "operator");
    expect(t.dispose).toHaveBeenCalledOnce();
    expect(t.error).toEqual([]);
  });

  it("revokes operator", async () => {
    const t = setup();
    const code = await main(["role", "revoke", "--email", "ada@example.com", "--role", "operator"], { DATABASE_URL: DB }, t.deps);
    expect(code).toBe(EXIT.ok);
    expect(t.roleService.revokeOperator).toHaveBeenCalledWith("u-1");
    expect(t.info.at(-1)).toBe("Revoked operator from ada@example.com.");
  });

  it("prints usage: exit 2 without a command, 0 for help", async () => {
    const t = setup();
    await expect(main([], {}, t.deps)).resolves.toBe(EXIT.usage);
    expect(t.error[0]).toContain("Usage: npm run operator -- <command>");
    expect(t.error[0]).toContain("role grant --email <email> --role operator");
    expect(t.error[0]).toContain("role revoke --email <email> --role operator");
    for (const help of ["help", "--help", "-h"]) {
      await expect(main([help], {}, t.deps)).resolves.toBe(EXIT.ok);
    }
    expect(t.info).toHaveLength(3);
    expect(t.deps.loadEnv).not.toHaveBeenCalled();
  });

  it("rejects an unknown command with usage and exit 2, before env or DB", async () => {
    const t = setup();
    await expect(main(["role", "delete"], {}, t.deps)).resolves.toBe(EXIT.usage);
    expect(t.error[0]).toMatch(/^Unknown command: role delete\n\nUsage:/);
    await expect(main(["frobnicate"], {}, t.deps)).resolves.toBe(EXIT.usage);
    expect(t.error[1]).toMatch(/^Unknown command: frobnicate\n/);
    expect(t.deps.loadEnv).not.toHaveBeenCalled();
    expect(t.deps.loadContainer).not.toHaveBeenCalled();
  });

  it("rejects unknown flags, positionals and missing flag values with exit 2", async () => {
    const t = setup();
    for (const args of [[...GRANT, "--force"], [...GRANT, "extra"], ["role", "grant", "--email"]]) {
      await expect(main(args, { DATABASE_URL: DB }, t.deps)).resolves.toBe(EXIT.usage);
    }
    expect(t.error).toHaveLength(3);
    for (const message of t.error) expect(message).toContain("Usage: npm run operator -- role grant --email <email> --role operator");
    expect(t.deps.loadEnv).not.toHaveBeenCalled();
  });

  it("refuses --role mentor (and any non-operator role) with exit 1, before env or DB", async () => {
    const t = setup();
    await expect(main(["role", "grant", "--email", "a@b.co", "--role", "mentor"], {}, t.deps)).resolves.toBe(EXIT.failed);
    expect(t.error).toEqual(["The mentor role is granted only by accepting an invitation."]);
    await expect(main(["role", "revoke", "--email", "a@b.co", "--role", "mentor"], {}, t.deps)).resolves.toBe(EXIT.failed);
    await expect(main(["role", "grant", "--email", "a@b.co", "--role", "mentee"], {}, t.deps)).resolves.toBe(EXIT.failed);
    expect(t.error.at(-1)).toBe("--role must be operator.");
    expect(t.deps.loadEnv).not.toHaveBeenCalled();
    expect(t.roleService.grant).not.toHaveBeenCalled();
  });

  it("rethrows a non-validation parse failure (a bug)", async () => {
    const t = setup();
    const broken = { ...roleGrantCommand, parse: () => { throw new Error("boom"); } };
    await expect(main(GRANT, {}, { ...t.deps, commands: [broken] })).rejects.toThrow("boom");
  });

  it("rethrows a non-validation AppError from parse (a bug, not refused input)", async () => {
    const t = setup();
    const broken = { ...roleGrantCommand, parse: () => { throw new NotFoundError("nope"); } };
    await expect(main(GRANT, {}, { ...t.deps, commands: [broken] })).rejects.toThrow("nope");
    expect(t.deps.loadEnv).not.toHaveBeenCalled();
  });

  it("fails with exit 1 when DATABASE_URL is missing or invalid", async () => {
    const t = setup();
    await expect(main(GRANT, {}, t.deps)).resolves.toBe(EXIT.failed);
    await expect(main(GRANT, { DATABASE_URL: "not a url" }, t.deps)).resolves.toBe(EXIT.failed);
    expect(t.error).toEqual([
      "DATABASE_URL is not set or is not a valid URL.",
      "DATABASE_URL is not set or is not a valid URL.",
    ]);
    expect(t.deps.loadContainer).not.toHaveBeenCalled();
  });

  it("requires --yes in production after printing the DB host", async () => {
    const t = setup();
    const env = { DATABASE_URL: DB, NODE_ENV: "production" };
    await expect(main(GRANT, env, t.deps)).resolves.toBe(EXIT.failed);
    expect(t.info).toEqual(["Database: db.internal:5432"]);
    expect(t.error).toEqual(["Refusing to run with NODE_ENV=production without --yes."]);
    expect(t.deps.loadContainer).not.toHaveBeenCalled();
    await expect(main([...GRANT, "--yes"], env, t.deps)).resolves.toBe(EXIT.ok);
    expect(t.roleService.grant).toHaveBeenCalledOnce();
  });

  it("reads env after loading it (the env object is mutated by loadEnv)", async () => {
    const t = setup();
    const env: Record<string, string | undefined> = {};
    t.deps.loadEnv = () => { env.DATABASE_URL = DB; };
    await expect(main(GRANT, env, t.deps)).resolves.toBe(EXIT.ok);
  });

  it("reports an AppError message with exit 1 and still disposes", async () => {
    const t = setup({ findByEmail: vi.fn().mockRejectedValue(new NotFoundError("No account with the email ada@example.com")) });
    await expect(main(GRANT, { DATABASE_URL: DB }, t.deps)).resolves.toBe(EXIT.failed);
    expect(t.error).toEqual(["No account with the email ada@example.com"]);
    expect(t.dispose).toHaveBeenCalledOnce();
  });

  it("hides unexpected errors behind 'unexpected error' and logs a safe summary", async () => {
    const t = setup({ grant: vi.fn().mockRejectedValue(new Error("connection refused")) });
    await expect(main(GRANT, { DATABASE_URL: DB }, t.deps)).resolves.toBe(EXIT.failed);
    expect(t.error).toEqual(["unexpected error"]);
    expect(t.logger.error).toHaveBeenCalledWith("Operator command failed", {
      command: "role grant",
      error: expect.objectContaining({ name: "Error" }),
    });
    expect(t.dispose).toHaveBeenCalledOnce();
  });
});

describe("databaseHost", () => {
  it("returns host and port only", () => {
    expect(databaseHost(DB)).toBe("db.internal:5432");
    expect(databaseHost("postgres://u:p@localhost/db")).toBe("localhost");
    expect(databaseHost(undefined)).toBeNull();
    expect(databaseHost("")).toBeNull();
    expect(databaseHost("garbage")).toBeNull();
    expect(databaseHost("file:///tmp/x")).toBeNull();
  });
});

describe("default wiring", () => {
  it("lists the role commands, writes to stdout/stderr, loads env from packages/app and imports the container lazily", async () => {
    expect(defaultDeps.commands).toEqual([roleGrantCommand, roleRevokeCommand]);
    const stdout = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    const stderr = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    defaultDeps.output.info("hello");
    defaultDeps.output.error("oops");
    expect(stdout).toHaveBeenCalledWith("hello\n");
    expect(stderr).toHaveBeenCalledWith("oops\n");
    defaultDeps.loadEnv();
    const appDir = fileURLToPath(new URL("../../../", import.meta.url));
    expect(loadEnvConfig).toHaveBeenCalledWith(appDir);
    expect(appDir.endsWith("/packages/app/")).toBe(true);
    const loaded = await defaultDeps.loadContainer();
    expect(loaded.container).toBe(fakeContainerModule.container);
  });
});
