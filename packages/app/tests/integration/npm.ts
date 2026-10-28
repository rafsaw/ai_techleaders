import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";

import { repositoryRoot } from "./context";

export interface NpmResult {
  /** The exit code, or `null` when a signal ended the process. */
  code: number | null;
  stdout: string;
  stderr: string;
}

export interface NpmOptions {
  /** Extra environment for the command (e.g. `APP_URL`, `SMTP_URL`); it wins over `.env*` files. */
  env?: Record<string, string>;
  /** Default 30 seconds. */
  timeoutMs?: number;
}

/**
 * Runs a root npm script against the test container and returns its exit code
 * and output, whatever the code. `DATABASE_URL` always comes from the
 * container: an explicit env var wins over `.env*` files, which the operator
 * CLI loads like Next.js does. Settles on "close" (stdio drained) so the log
 * is never ended under a late write; on timeout it kills the process group and
 * waits for it to close before rejecting.
 */
export async function runNpmResult(args: string[], databaseURL: string, logPath: string, options: NpmOptions = {}): Promise<NpmResult> {
  const timeoutMs = options.timeoutMs ?? 30_000;
  const log = createWriteStream(logPath, { flags: "a" });
  const child = spawn("npm", ["run", ...args], {
    cwd: repositoryRoot,
    env: { ...process.env, ...options.env, NODE_ENV: "production", DATABASE_URL: databaseURL, DB_DEBUG: "false" },
    detached: process.platform !== "win32",
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString(); });
  child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });
  child.stdout.pipe(log, { end: false });
  child.stderr.pipe(log, { end: false });
  const name = args.filter((arg) => arg !== "--").join(" ");
  try {
    const code = await new Promise<number | null>((resolve, reject) => {
      let timedOut = false;
      const timeout = setTimeout(() => {
        timedOut = true;
        if (process.platform !== "win32" && child.pid) process.kill(-child.pid, "SIGKILL");
        else child.kill("SIGKILL");
      }, timeoutMs);
      child.once("error", (error) => { clearTimeout(timeout); reject(error); });
      child.once("close", (exitCode) => {
        clearTimeout(timeout);
        if (timedOut) reject(new Error(`npm run ${name} did not finish in ${timeoutMs / 1000} seconds; see ${logPath}`));
        else resolve(exitCode);
      });
    });
    return { code, stdout, stderr };
  } finally {
    log.end();
  }
}

/** Like `runNpmResult`, but a nonzero exit rejects; returns stdout. */
export async function runNpm(args: string[], databaseURL: string, logPath: string, options: NpmOptions = {}): Promise<string> {
  const result = await runNpmResult(args, databaseURL, logPath, options);
  if (result.code !== 0) {
    throw new Error(`npm run ${args.filter((arg) => arg !== "--").join(" ")} failed (${result.code ?? "signal"}); see ${logPath}`);
  }
  return result.stdout;
}
