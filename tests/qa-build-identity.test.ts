import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const roots: string[] = [];
const serverPids: number[] = [];
afterEach(() => {
  for (const pid of serverPids.splice(0)) process.kill(-pid, "SIGTERM");
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

// The fixture commits the repository's real .gitignore, so anything the launcher creates while it
// runs counts as a source change here exactly as it would in a real checkout. Stubs live outside
// the fixture so they can't affect its git status.
function createFixture() {
  const root = mkdtempSync(join(tmpdir(), "qa-identity-")); roots.push(root);
  const bin = mkdtempSync(join(tmpdir(), "qa-identity-bin-")); roots.push(bin);
  for (const dir of [".ai/scripts", ".ai/qa", "packages/app/.next"]) mkdirSync(join(root, dir), { recursive: true });
  copyFileSync(resolve(".ai/scripts/test-env-up.sh"), join(root, ".ai/scripts/test-env-up.sh"));
  copyFileSync(resolve(".gitignore"), join(root, ".gitignore"));
  writeFileSync(join(root, ".ai/scripts/test-env-down.sh"), "#!/bin/sh\nexit 0\n");
  execFileSync("git", ["init", "-q", root]);
  execFileSync("git", ["-C", root, "config", "user.email", "test@example.com"]);
  execFileSync("git", ["-C", root, "config", "user.name", "Test"]);
  execFileSync("git", ["-C", root, "add", "."]);
  execFileSync("git", ["-C", root, "commit", "-qm", "fixture"]);
  const head = execFileSync("git", ["-C", root, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  writeFileSync(join(bin, "curl"), "#!/bin/sh\necho DevMentor\n", { mode: 0o755 });
  const launch = () => spawnSync("sh", [join(root, ".ai/scripts/test-env-up.sh")], { env: { ...process.env, PATH: `${bin}:${process.env.PATH}` }, encoding: "utf8" });
  return { root, bin, head, launch };
}

describe("QA build identity", () => {
  it.each(["clean", "untracked", "marker mismatch"]) ("only reuses a matching clean build: %s", (scenario) => {
    const { root, bin, head, launch } = createFixture();
    writeFileSync(join(root, "packages/app/.next/BUILD_ID"), "build");
    writeFileSync(join(root, "packages/app/.next/BUILD_SOURCE"), scenario === "marker mismatch" ? "old" : head);
    writeFileSync(join(root, ".ai/qa/test-env.json"), JSON.stringify({ status: "running", sourceHead: head, app: { pid: process.pid }, baseUrl: "http://example.test" }));
    writeFileSync(join(bin, "npm"), `#!/bin/sh\necho rebuilt > '${root}/rebuilt'\nexit 42\n`, { mode: 0o755 });
    if (scenario === "untracked") writeFileSync(join(root, "new-source.ts"), "changed");
    const result = launch();
    if (scenario === "clean") {
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("TEST_ENV_REUSED=1");
    } else {
      expect(result.status).toBe(42);
      expect(readFileSync(join(root, "rebuilt"), "utf8")).toContain("rebuilt");
    }
  });

  it("records the clean head on a cold start and reuses that environment on the next launch", () => {
    const { root, bin, head, launch } = createFixture();
    const builds = join(bin, "builds");
    writeFileSync(join(bin, "npm"), `#!/bin/sh\ncase "$*" in\n  "run build") echo build > packages/app/.next/BUILD_ID; echo built >> '${builds}' ;;\n  "run start"*) exec sleep 300 ;;\nesac\n`, { mode: 0o755 });
    writeFileSync(join(bin, "docker"), "#!/bin/sh\nexit 0\n", { mode: 0o755 });
    writeFileSync(join(bin, "agent-browser"), "#!/bin/sh\necho 0.0.0\n", { mode: 0o755 });

    const first = launch();
    const descriptor = JSON.parse(readFileSync(join(root, ".ai/qa/test-env.json"), "utf8"));
    serverPids.push(descriptor.app.pid);

    expect(first.status).toBe(0);
    expect(first.stdout).toContain("TEST_ENV_REUSED=0");
    expect(descriptor.sourceHead).toBe(head);

    const second = launch();

    expect(second.status).toBe(0);
    expect(second.stdout).toContain("TEST_ENV_REUSED=1");
    expect(readFileSync(builds, "utf8").trim().split("\n")).toHaveLength(1);
  });
});
