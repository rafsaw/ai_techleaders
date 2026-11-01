import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

describe("QA build identity", () => {
  it.each(["clean", "untracked", "marker mismatch"]) ("only reuses a matching clean build: %s", (scenario) => {
    const root = mkdtempSync(join(tmpdir(), "qa-identity-")); roots.push(root);
    for (const dir of [".ai/scripts", ".ai/qa", "packages/app/.next", "bin"]) mkdirSync(join(root, dir), { recursive: true });
    copyFileSync(resolve(".ai/scripts/test-env-up.sh"), join(root, ".ai/scripts/test-env-up.sh"));
    writeFileSync(join(root, ".ai/scripts/test-env-down.sh"), "#!/bin/sh\nexit 0\n");
    execFileSync("git", ["init", "-q", root]);
    execFileSync("git", ["-C", root, "config", "user.email", "test@example.com"]);
    execFileSync("git", ["-C", root, "config", "user.name", "Test"]);
    writeFileSync(join(root, ".gitignore"), ".ai/qa/\npackages/app/.next/\nbin/\n");
    execFileSync("git", ["-C", root, "add", "."]);
    execFileSync("git", ["-C", root, "commit", "-qm", "fixture"]);
    const head = execFileSync("git", ["-C", root, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    writeFileSync(join(root, "packages/app/.next/BUILD_ID"), "build");
    writeFileSync(join(root, "packages/app/.next/BUILD_SOURCE"), scenario === "marker mismatch" ? "old" : head);
    writeFileSync(join(root, ".ai/qa/test-env.json"), JSON.stringify({ status: "running", sourceHead: head, app: { pid: process.pid }, baseUrl: "http://example.test" }));
    writeFileSync(join(root, "bin/curl"), "#!/bin/sh\necho DevMentor\n", { mode: 0o755 });
    writeFileSync(join(root, "bin/npm"), `#!/bin/sh\necho rebuilt > '${root}/rebuilt'\nexit 42\n`, { mode: 0o755 });
    if (scenario === "untracked") writeFileSync(join(root, "new-source.ts"), "changed");
    const result = spawnSync("sh", [join(root, ".ai/scripts/test-env-up.sh")], { env: { ...process.env, PATH: `${root}/bin:${process.env.PATH}` }, encoding: "utf8" });
    if (scenario === "clean") {
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("TEST_ENV_REUSED=1");
    } else {
      expect(result.status).toBe(42);
      expect(readFileSync(join(root, "rebuilt"), "utf8")).toContain("rebuilt");
    }
  });
});
