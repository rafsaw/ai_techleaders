import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";

import { repositoryRoot } from "./context";

/**
 * Runs a root npm script against the test container and returns its stdout.
 * `DATABASE_URL` always comes from the container: an explicit env var wins
 * over `.env*` files, which the operator CLI loads like Next.js does. Settles
 * on "close" (stdio drained) so the log is never ended under a late write; on
 * timeout it kills the process group and waits for it to close before rejecting.
 */
export async function runNpm(args: string[], databaseURL: string, logPath: string): Promise<string> {
  const log = createWriteStream(logPath, { flags: "a" });
  const child = spawn("npm", ["run", ...args], {
    cwd: repositoryRoot,
    env: { ...process.env, NODE_ENV: "production", DATABASE_URL: databaseURL, DB_DEBUG: "false" },
    detached: process.platform !== "win32",
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString(); });
  child.stdout.pipe(log, { end: false });
  child.stderr.pipe(log, { end: false });
  const name = args.filter((arg) => arg !== "--").join(" ");
  try {
    await new Promise<void>((resolve, reject) => {
      let timedOut = false;
      const timeout = setTimeout(() => {
        timedOut = true;
        if (process.platform !== "win32" && child.pid) process.kill(-child.pid, "SIGKILL");
        else child.kill("SIGKILL");
      }, 30_000);
      child.once("error", (error) => { clearTimeout(timeout); reject(error); });
      child.once("close", (code, signal) => {
        clearTimeout(timeout);
        if (timedOut) reject(new Error(`npm run ${name} did not finish in 30 seconds; see ${logPath}`));
        else if (code === 0) resolve();
        else reject(new Error(`npm run ${name} failed (${code ?? signal}); see ${logPath}`));
      });
    });
  } finally {
    log.end();
  }
  return stdout;
}
