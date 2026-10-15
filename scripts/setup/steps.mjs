// Steps for `npm run setup`. This runs before `npm install`, so only Node
// built-ins may be imported here.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
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

// Newest mtime of the lockfile and every package.json that `npm install` reads.
export function newestManifestMtime(ctx) {
  const manifests = [join(ctx.root, "package-lock.json"), join(ctx.root, "package.json")];
  for (const entry of readdirSync(join(ctx.root, "packages"), { withFileTypes: true })) {
    if (entry.isDirectory()) manifests.push(join(ctx.root, "packages", entry.name, "package.json"));
  }
  return Math.max(...manifests.filter((file) => existsSync(file)).map((file) => statSync(file).mtimeMs));
}

// npm rewrites node_modules/.package-lock.json on every install, just after
// package-lock.json, so it is fresh when newer than every manifest.
export const dependencies = {
  name: "Dependencies",
  check(ctx) {
    const hiddenLockfile = join(ctx.root, "node_modules", ".package-lock.json");
    if (!existsSync(hiddenLockfile)) return null;
    return statSync(hiddenLockfile).mtimeMs >= newestManifestMtime(ctx) ? "node_modules is up to date" : null;
  },
  action(ctx) {
    if (!exec("npm", ["install"], ctx).ok) {
      throw new StepError("`npm install` failed", "fix the npm error above and re-run npm run setup");
    }
  },
};

// `docker compose ps --format json` prints a JSON array on older Compose
// versions and one JSON object per line on newer ones.
export function postgresHealthy(output) {
  const text = output.trim();
  let services;
  try {
    services = text.startsWith("[") ? JSON.parse(text) : text.split("\n").map((line) => JSON.parse(line));
  } catch {
    return false;
  }
  return services.some((service) => service.Service === "postgres" && service.Health === "healthy");
}

export const postgres = {
  name: "PostgreSQL",
  check(ctx) {
    if (hasEnvDatabaseUrl(ctx)) return ENV_REASON;
    const ps = exec("docker", ["compose", "ps", "--format", "json"], ctx, true);
    return ps.ok && postgresHealthy(ps.stdout) ? "postgres container is healthy" : null;
  },
  action(ctx) {
    if (!exec("docker", ["compose", "up", "-d", "--wait"], ctx).ok) {
      throw new StepError(
        "`docker compose up -d --wait` failed",
        "check the Docker output above; if port 5432 is taken, remap it in docker-compose.yml and DATABASE_URL (README › Manual setup)",
      );
    }
  },
};

export const steps = [prerequisites, dependencies, postgres];
