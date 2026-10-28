import { fileURLToPath } from "node:url";
import { parseArgs, type ParseArgsOptionsConfig } from "node:util";

import { isAppError, summarizeError, type AppContainer, type Cradle } from "@devmentor/core";
import nextEnv from "@next/env";

import { inviteCreateCommand } from "@/server/cli/commands/invite-create.command";
import { inviteResendCommand } from "@/server/cli/commands/invite-resend.command";
import { inviteRevokeCommand } from "@/server/cli/commands/invite-revoke.command";
import { roleGrantCommand } from "@/server/cli/commands/role-grant.command";
import { roleRevokeCommand } from "@/server/cli/commands/role-revoke.command";

// The operator CLI runner (platform P12): `npm run operator -- <command> [flags]`.
// It parses argv, loads env like Next.js and the db CLI, prints the database
// host, requires `--yes` in production, runs one command in a container scope
// and disposes the container. Output is safe status only, never secrets.

/** Where commands write: status to stdout, failures to stderr. */
export interface Output {
  info(message: string): void;
  error(message: string): void;
}

export type ParsedValues = Record<string, string | boolean | undefined>;

export interface OperatorCommand<F = unknown> {
  /** Words that select the command, e.g. `role grant`. */
  name: string;
  summary: string;
  /** Flags after the command name, e.g. `--email <email> --role operator`. */
  usage: string;
  options: ParseArgsOptionsConfig;
  /**
   * Validates parsed flags before any env or database work; throws
   * `ValidationError` for refused input (e.g. `--role mentor`).
   */
  parse(values: ParsedValues): F;
  run(cradle: Cradle, flags: F, out: Output): Promise<void>;
}

export type CliEnv = Record<string, string | undefined>;

export interface CliDeps {
  commands: readonly OperatorCommand[];
  output: Output;
  /** Loads `.env*` from `packages/app` into the process env. */
  loadEnv(): void;
  /** Imported only after env is loaded: the db config reads it on import. */
  loadContainer(): Promise<{ container: AppContainer; createRequestScope(): AppContainer }>;
}

/** Exit codes: success, a refused or failed operation, a usage error. */
export const EXIT = { ok: 0, failed: 1, usage: 2 } as const;

const SHARED_OPTIONS = {
  yes: { type: "boolean" },
} satisfies ParseArgsOptionsConfig;

const HELP = new Set(["help", "--help", "-h"]);

function usage(commands: CliDeps["commands"]): string {
  const lines = commands.map((command) => `  ${command.name} ${command.usage}\n      ${command.summary}`);
  return [
    "Usage: npm run operator -- <command> [flags] [--yes]",
    "",
    "Commands:",
    ...lines,
    "",
    "--yes is required when NODE_ENV=production.",
  ].join("\n");
}

/** `host[:port]` of a database URL, never its credentials; null when unusable. */
export function databaseHost(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).host || null;
  } catch {
    return null;
  }
}

export async function main(argv: readonly string[], env: CliEnv, deps: CliDeps): Promise<number> {
  const { commands, output: out } = deps;
  const [first, second, ...rest] = argv;
  if (first === undefined || HELP.has(first)) {
    out[first === undefined ? "error" : "info"](usage(commands));
    return first === undefined ? EXIT.usage : EXIT.ok;
  }
  const command = commands.find((candidate) => candidate.name === `${first} ${second}`);
  if (!command) {
    out.error(`Unknown command: ${[first, second].filter(Boolean).join(" ")}\n\n${usage(commands)}`);
    return EXIT.usage;
  }

  let values: ParsedValues;
  try {
    ({ values } = parseArgs({
      args: rest,
      options: { ...command.options, ...SHARED_OPTIONS },
      strict: true,
      allowPositionals: false,
    }));
  } catch (error) {
    out.error(`${(error as Error).message}\n\nUsage: npm run operator -- ${command.name} ${command.usage}`);
    return EXIT.usage;
  }

  let flags: unknown;
  try {
    flags = command.parse(values);
  } catch (error) {
    if (!isAppError(error) || error.code !== "validation_error") throw error;
    out.error(error.message);
    return EXIT.failed;
  }

  deps.loadEnv();
  const host = databaseHost(env.DATABASE_URL);
  if (!host) {
    out.error("DATABASE_URL is not set or is not a valid URL.");
    return EXIT.failed;
  }
  out.info(`Database: ${host}`);
  if (env.NODE_ENV === "production" && values.yes !== true) {
    out.error("Refusing to run with NODE_ENV=production without --yes.");
    return EXIT.failed;
  }

  const { container, createRequestScope } = await deps.loadContainer();
  try {
    await command.run(createRequestScope().cradle, flags, out);
    return EXIT.ok;
  } catch (error) {
    if (isAppError(error)) {
      out.error(error.message);
      return EXIT.failed;
    }
    container.cradle.logger.error("Operator command failed", {
      command: command.name,
      error: summarizeError(error),
    });
    out.error("unexpected error");
    return EXIT.failed;
  } finally {
    await container.dispose();
  }
}

const APP_DIR = fileURLToPath(new URL("../../..", import.meta.url));

/** The real wiring used by `operator.ts`. */
export const defaultDeps: CliDeps = {
  commands: [roleGrantCommand, roleRevokeCommand, inviteCreateCommand, inviteRevokeCommand, inviteResendCommand],
  output: {
    info: (message) => void process.stdout.write(`${message}\n`),
    error: (message) => void process.stderr.write(`${message}\n`),
  },
  loadEnv: () => void nextEnv.loadEnvConfig(APP_DIR),
  loadContainer: () => import("@/server/container"),
};
