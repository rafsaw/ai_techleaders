import { spawn, execFile, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { appendFile, access, mkdir } from "node:fs/promises";
import { createServer } from "node:net";
import { join } from "node:path";
import type { Readable } from "node:stream";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { TestProject } from "vitest/node";

import { integrationResultsDirectory, browserExecutable, repositoryRoot } from "./context";

const execute = promisify(execFile);

async function availablePort(): Promise<number> {
  const socket = createServer();
  await new Promise<void>((resolve, reject) => {
    socket.once("error", reject);
    socket.listen(0, "127.0.0.1", resolve);
  });
  const address = socket.address();
  await new Promise<void>((resolve, reject) => socket.close((error) => error ? reject(error) : resolve()));
  if (!address || typeof address === "string") throw new Error("Could not allocate an integration server port");
  return address.port;
}

async function stopServer(server: ChildProcess): Promise<void> {
  if (server.exitCode !== null || server.signalCode !== null) return;
  const stop = (signal: NodeJS.Signals) => {
    if (process.platform !== "win32" && server.pid) process.kill(-server.pid, signal);
    else server.kill(signal);
  };
  const exited = new Promise<void>((resolve) => server.once("exit", () => resolve()));
  stop("SIGTERM");
  await Promise.race([exited, delay(5_000)]);
  if (server.exitCode === null && server.signalCode === null) {
    stop("SIGKILL");
    await Promise.race([exited, delay(5_000)]);
  }
}

async function waitForApplication(baseURL: string, server: ChildProcess, serverLogPath: string): Promise<void> {
  const deadline = Date.now() + 60_000;
  let lastError: unknown;
  while (Date.now() < deadline) {
    if (server.exitCode !== null || server.signalCode !== null) {
      throw new Error(`Production server exited before becoming ready (${server.exitCode ?? server.signalCode})`);
    }
    try {
      // A healthy home page alone would miss database/migration failures.
      const response = await fetch(`${baseURL}/api/users`, { signal: AbortSignal.timeout(2_000) });
      const body: unknown = await response.json();
      if (response.ok && body && typeof body === "object" && "ok" in body && body.ok === true && "data" in body && Array.isArray(body.data)) return;
      lastError = new Error(`GET /api/users returned ${response.status}: ${JSON.stringify(body)}`);
    } catch (error) {
      lastError = error;
    }
    await delay(250);
  }
  throw new Error(`Production server did not become ready in 60 seconds; see ${serverLogPath}`, { cause: lastError });
}

export default async function setup(project: TestProject) {
  const browserSession = `devmentor-integration-${randomUUID()}`;
  const artifactsDirectory = join(integrationResultsDirectory, browserSession);
  await mkdir(artifactsDirectory, { recursive: true });
  let postgres: StartedPostgreSqlContainer | undefined;
  let postgresStream: Readable | undefined;
  let server: ChildProcess | undefined;
  let migrations: ChildProcess | undefined;
  let browserReady = false;
  let cleanupPromise: Promise<void> | undefined;
  const serverLog = createWriteStream(join(artifactsDirectory, "server.log"), { flags: "w" });
  const postgresLog = createWriteStream(join(artifactsDirectory, "postgres.log"), { flags: "w" });
  const migrationsLog = createWriteStream(join(artifactsDirectory, "migrations.log"), { flags: "w" });

  const releaseResources = async () => {
    const safely = async (name: string, action: () => Promise<unknown>) => {
      try {
        await action();
      } catch (error) {
        await appendFile(join(artifactsDirectory, "cleanup.log"), `${name}: ${String(error)}\n`);
      }
    };
    if (browserReady) await safely("browser", () => execute(browserExecutable, ["--session", browserSession, "close"], {
      cwd: repositoryRoot,
      timeout: 15_000,
      killSignal: "SIGKILL",
    }));
    if (migrations) await safely("migrations", () => stopServer(migrations!));
    if (server) await safely("server", () => stopServer(server!));
    serverLog.end();
    migrationsLog.end();
    postgresStream?.destroy();
    postgresLog.end();
    if (postgres) await safely("postgres", () => postgres!.stop({ timeout: 10_000 }));
  };
  const cleanup = () => {
    cleanupPromise ??= releaseResources().finally(() => {
      process.off("SIGINT", interrupted);
      process.off("SIGTERM", terminated);
    });
    return cleanupPromise;
  };
  const onSignal = (code: number) => {
    // GitHub cancellation sends SIGINT/SIGTERM; release the detached app process
    // as well as the container. Testcontainers' reaper also handles abrupt exits.
    void cleanup().finally(() => process.exit(code));
  };
  const interrupted = () => onSignal(130);
  const terminated = () => onSignal(143);
  process.once("SIGINT", interrupted);
  process.once("SIGTERM", terminated);

  try {
    await access(join(repositoryRoot, "packages/app/.next/BUILD_ID"));
    await access(browserExecutable);
    // Never inherit DATABASE_URL: this URI comes exclusively from this new container.
    postgres = await new PostgreSqlContainer("postgres:17-alpine")
      .withDatabase("devmentor_integration")
      .withUsername("integration")
      .withPassword(randomUUID())
      .withStartupTimeout(120_000)
      .start();
    postgresStream = await postgres.logs();
    postgresStream.pipe(postgresLog, { end: false });
    const environment: NodeJS.ProcessEnv = {
      ...process.env,
      NODE_ENV: "production",
      DATABASE_URL: postgres.getConnectionUri(),
      DB_POOL_MIN: "0",
      DB_POOL_MAX: "2",
      DB_DEBUG: "false",
      NEXT_TELEMETRY_DISABLED: "1",
    };
    migrations = spawn("npm", ["run", "db:migrate"], {
      cwd: repositoryRoot,
      env: environment,
      detached: process.platform !== "win32",
      stdio: ["ignore", "pipe", "pipe"],
    });
    migrations.stdout!.pipe(migrationsLog, { end: false });
    migrations.stderr!.pipe(migrationsLog, { end: false });
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Migrations did not finish in 60 seconds")), 60_000);
      migrations!.once("error", (error) => { clearTimeout(timeout); reject(error); });
      migrations!.once("exit", (code, signal) => {
        clearTimeout(timeout);
        if (code === 0) resolve();
        else reject(new Error(`Migrations failed (${code ?? signal}); see ${artifactsDirectory}/migrations.log`));
      });
    });
    const baseURL = `http://127.0.0.1:${await availablePort()}`;
    server = spawn("npm", ["run", "start", "-w", "@devmentor/app", "--", "--hostname", "127.0.0.1", "--port", new URL(baseURL).port], {
      cwd: repositoryRoot,
      env: environment,
      detached: process.platform !== "win32",
      stdio: ["ignore", "pipe", "pipe"],
    });
    server.stdout!.pipe(serverLog, { end: false });
    server.stderr!.pipe(serverLog, { end: false });
    let spawnError: Error | undefined;
    server.once("error", (error) => { spawnError = error; });
    await waitForApplication(baseURL, server, join(artifactsDirectory, "server.log"));
    if (spawnError) throw spawnError;
    project.provide("baseURL", baseURL);
    project.provide("databaseURL", environment.DATABASE_URL!);
    project.provide("browserSession", browserSession);
    project.provide("integrationArtifactsDirectory", artifactsDirectory);
    browserReady = true;
    return cleanup;
  } catch (error) {
    await appendFile(join(artifactsDirectory, "setup.log"), `${String(error)}\n`);
    await cleanup();
    throw new Error("Integration setup failed. Build the app first and ensure Docker and agent-browser Chromium are available; see test-results/integration logs.", { cause: error });
  }
}
