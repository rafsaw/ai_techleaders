import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { appendFile } from "node:fs/promises";
import { join } from "node:path";

import { afterAll, afterEach, describe, expect, inject, it } from "vitest";

import { IntegrationBrowser } from "./browser";
import { repositoryRoot } from "./context";

/**
 * Runs `npm run db:seed` against the test container. Settles on "close" (stdio
 * drained) so the log is never ended under a late write; on timeout it kills the
 * process group and waits for it to close before rejecting.
 */
async function runSeed(databaseURL: string, logPath: string): Promise<void> {
  const log = createWriteStream(logPath, { flags: "a" });
  const seed = spawn("npm", ["run", "db:seed"], {
    cwd: repositoryRoot,
    env: { ...process.env, NODE_ENV: "production", DATABASE_URL: databaseURL, DB_DEBUG: "false" },
    detached: process.platform !== "win32",
    stdio: ["ignore", "pipe", "pipe"],
  });
  seed.stdout.pipe(log, { end: false });
  seed.stderr.pipe(log, { end: false });
  try {
    await new Promise<void>((resolve, reject) => {
      let timedOut = false;
      const timeout = setTimeout(() => {
        timedOut = true;
        if (process.platform !== "win32" && seed.pid) process.kill(-seed.pid, "SIGKILL");
        else seed.kill("SIGKILL");
      }, 30_000);
      seed.once("error", (error) => { clearTimeout(timeout); reject(error); });
      seed.once("close", (code, signal) => {
        clearTimeout(timeout);
        if (timedOut) reject(new Error(`db:seed did not finish in 30 seconds; see ${logPath}`));
        else if (code === 0) resolve();
        else reject(new Error(`db:seed failed (${code ?? signal}); see ${logPath}`));
      });
    });
  } finally {
    log.end();
  }
}

describe("production application with ephemeral PostgreSQL", () => {
  const baseURL = inject("baseURL");
  const databaseURL = inject("databaseURL");
  const artifactsDirectory = inject("integrationArtifactsDirectory");
  const browser = new IntegrationBrowser(inject("browserSession"), artifactsDirectory);

  afterEach(async ({ task }) => {
    // Keep both passing checkpoints and failure evidence for CI artifact review.
    try {
      await browser.capture(task.name);
    } catch (error) {
      await appendFile(join(artifactsDirectory, "capture.log"), `${task.name}: ${String(error)}\n`);
    }
  });

  afterAll(async () => {
    await browser.command("close");
  });

  it("renders the homepage with its title, visible content, and admin navigation", async () => {
    await browser.command("open", baseURL);
    expect((await browser.command("get", "title")).title).toBe("DevMentor");
    expect(await browser.heading("DevMentor")).toBe("DevMentor");
    expect(await browser.visible("heading", "DevMentor")).toBe(true);
    expect(await browser.visible("link", "Open backend")).toBe(true);
    const homepage = await browser.snapshot();
    expect(homepage).toMatch(/AI Techleaders/i);
    expect(homepage).toMatch(/^\s*- main(?:\s|$)/m);
    expect(homepage).toContain("A project for tech leaders who use AI");

    await browser.click("link", "Open backend");
    await browser.waitForText("0 registered users");
    expect((await browser.command("get", "url")).url).toBe(`${baseURL}/backend`);
  });

  it("renders the admin page directly with its title, navigation, and connected database", async () => {
    await browser.command("open", `${baseURL}/backend`);
    await browser.waitForText("0 registered users");
    expect((await browser.command("get", "title")).title).toBe("Dashboard · DevMentor");
    expect(await browser.heading("Dashboard")).toBe("Dashboard");
    expect(await browser.visible("heading", "Dashboard")).toBe(true);
    expect(await browser.visible("link", "Users")).toBe(true);
    expect(await browser.visible("button", "View site")).toBe(true);
    const dashboard = await browser.snapshot();
    expect(dashboard).toMatch(/^\s*- banner(?:\s|$)/m);
    expect(dashboard).toMatch(/^\s*- navigation(?:\s|$)/m);
    expect(dashboard).toMatch(/^\s*- main(?:\s|$)/m);
    expect(dashboard).toContain("PostgreSQL via MikroORM");
    expect(dashboard).toContain("Connected");
    expect(dashboard).toContain("0 registered users");
    expect(dashboard).not.toContain("Unavailable");
    await browser.capture("admin-empty");

    await browser.click("button", "View site");
    await browser.waitForText("A project for tech leaders");
    expect((await browser.command("get", "url")).url).toBe(`${baseURL}/`);
    expect(await browser.heading("DevMentor")).toBe("DevMentor");
  });

  it("validates input, creates a user, persists it on reload, and rejects duplicate email", async () => {
    await browser.command("open", `${baseURL}/backend/users`);
    await browser.waitForText("No users yet");
    expect((await browser.command("get", "title")).title).toBe("Users · DevMentor");
    expect(await browser.heading("Users")).toBe("Users");
    expect(await browser.snapshot()).toContain("Create the first one with the form.");

    await browser.click("button", "Create user");
    await browser.waitForText("Name is required");
    const validation = await browser.snapshot();
    expect(validation).toContain("Name is required");
    expect(validation).toContain("Enter a valid email address");
    await browser.capture("users-validation");

    const email = `integration-${randomUUID()}@example.com`;
    await browser.fill("Name", "Integration User");
    await browser.fill("Email", email);
    await browser.click("button", "Create user");
    await browser.waitForText(email);
    const created = await browser.snapshot();
    expect(created).toContain('cell "Integration User"');
    expect(created).toContain(`cell "${email}"`);
    expect(created).not.toContain("No users yet");
    expect(created).not.toContain("Name is required");
    await browser.capture("users-created");

    await browser.command("reload");
    await browser.waitForText(email);
    expect(await browser.snapshot()).toContain(`cell "${email}"`);

    await browser.fill("Name", "Duplicate User");
    // Exercise the shared schema's normalization and the actual unique index.
    await browser.fill("Email", email.toUpperCase());
    await browser.click("button", "Create user");
    await browser.waitForText("A user with this email already exists");
    const duplicate = await browser.snapshot();
    expect(duplicate).toContain("Could not save");
    expect(duplicate).toContain("A user with this email already exists");
    expect(duplicate.split(`cell "${email}"`).length - 1).toBe(1);
    await browser.capture("users-duplicate");

    await browser.command("open", `${baseURL}/backend`);
    expect(await browser.heading("Dashboard")).toBe("Dashboard");
    expect(await browser.snapshot()).toContain("1 registered users");
  });

  // Keep last: it adds the sample user to the container shared by every
  // integration file (one globalSetup), and earlier cases assert the empty
  // state and exact user counts. A new integration file must not assume an
  // empty users table once this case has run.
  it("seeds the sample user idempotently with npm run db:seed", async () => {
    const seedLog = join(artifactsDirectory, "seed.log");
    await runSeed(databaseURL, seedLog);
    await runSeed(databaseURL, seedLog);

    await browser.command("open", `${baseURL}/backend/users`);
    await browser.waitForText("ada@devmentor.dev");
    const users = await browser.snapshot();
    expect(users).toContain('cell "Ada Lovelace"');
    expect(users.split('cell "ada@devmentor.dev"').length - 1).toBe(1);
    await browser.capture("users-seeded");

    await browser.command("open", `${baseURL}/backend`);
    expect(await browser.heading("Dashboard")).toBe("Dashboard");
    expect(await browser.snapshot()).toContain("2 registered users");
  });
});
