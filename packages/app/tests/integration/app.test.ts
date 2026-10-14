import { randomUUID } from "node:crypto";
import { appendFile } from "node:fs/promises";
import { join } from "node:path";

import { afterAll, afterEach, describe, expect, inject, it } from "vitest";

import { IntegrationBrowser } from "./browser";

describe("production application with ephemeral PostgreSQL", () => {
  const baseURL = inject("baseURL");
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
});
