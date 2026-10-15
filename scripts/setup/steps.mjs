// Steps for `npm run setup`. This runs before `npm install`, so only Node
// built-ins may be imported here.
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const MIN_NODE = "22.17.0";
export const ENV_REASON = "using DATABASE_URL from environment";

export class StepError extends Error {
  constructor(message, fix) {
    super(message);
    this.fix = fix;
  }
}

export function createContext() {
  return {
    env: process.env,
    nodeVersion: process.versions.node,
    root: join(dirname(fileURLToPath(import.meta.url)), "..", ".."),
  };
}

// Only the process environment counts; `.env*` files are never read (spec A6).
export function hasEnvDatabaseUrl(ctx) {
  return Boolean(ctx.env.DATABASE_URL);
}

// Captured runs return stdout; the others stream their output to the user.
export function exec(command, args, ctx, capture = false) {
  const result = spawnSync(command, args, {
    cwd: ctx.root,
    encoding: "utf8",
    stdio: capture ? "pipe" : "inherit",
  });
  return { ok: !result.error && result.status === 0, stdout: result.stdout ?? "" };
}

export function nodeSatisfies(version, minimum) {
  const actual = version.split(".").map(Number);
  const required = minimum.split(".").map(Number);
  for (let i = 0; i < required.length; i++) {
    if (actual[i] !== required[i]) return actual[i] > required[i];
  }
  return true;
}

export const prerequisites = {
  name: "Prerequisites",
  check: () => null,
  action(ctx) {
    if (!nodeSatisfies(ctx.nodeVersion, MIN_NODE)) {
      throw new StepError(`Node ${ctx.nodeVersion} is older than ${MIN_NODE}`, `install Node ≥ ${MIN_NODE}`);
    }
    if (hasEnvDatabaseUrl(ctx)) return;
    const dockerFix = "start Docker (Docker Desktop with WSL integration enabled), or export DATABASE_URL to use your own PostgreSQL";
    if (!exec("docker", ["info"], ctx, true).ok) {
      throw new StepError("`docker info` failed: Docker is not installed or not running", dockerFix);
    }
    if (!exec("docker", ["compose", "version"], ctx, true).ok) {
      throw new StepError("`docker compose version` failed: the Compose plugin is missing", dockerFix);
    }
  },
};

export const steps = [prerequisites];
