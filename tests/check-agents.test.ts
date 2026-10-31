import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { checkAgents, listAgentFiles, parseRoutes, ROOT_BUDGET, UNIT_BUDGET } from "../scripts/check-agents/run.mjs";

const lines = (count: number) => Array.from({ length: count }, (_, i) => `line ${i}`).join("\n");
const router = (...rows: string[]) => ["| Task | Read |", "| --- | --- |", ...rows, ""].join("\n");

const roots: string[] = [];

function repo(files: Record<string, string>) {
  const root = mkdtempSync(path.join(tmpdir(), "check-agents-"));
  roots.push(root);
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), content);
  }
  return root;
}

function check(root: string) {
  const log = vi.fn();
  return { code: checkAgents(root, log), output: log.mock.calls.flat().join("\n") };
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  process.exitCode = undefined;
});

describe("parseRoutes", () => {
  it("returns the backticked targets of each row and stops at the end of the table", () => {
    const markdown = `intro\n\n${router("| Bug fix | `a.md`, then `b.md` |", "| Review | none |")}\n| Other | \`c.md\` |`;

    expect(parseRoutes(markdown)).toEqual([
      { task: "Bug fix", targets: ["a.md", "b.md"] },
      { task: "Review", targets: [] },
    ]);
  });

  it("returns nothing without a router table", () => {
    expect(parseRoutes("| Task | Command |\n| --- | --- |\n| Dev | `x` |\n")).toEqual([]);
  });
});

describe("listAgentFiles", () => {
  it("finds nested files and skips tool state and generated output", () => {
    const root = repo({
      "AGENTS.md": "root",
      "packages/app/AGENTS.md": "unit",
      "packages/app/node_modules/dep/AGENTS.md": "dependency",
      ".claude/worktrees/x/AGENTS.md": "worktree",
      "README.md": "other",
    });

    expect(listAgentFiles(root).map((file: string) => path.relative(root, file)).sort()).toEqual([
      "AGENTS.md",
      path.join("packages", "app", "AGENTS.md"),
    ]);
  });
});

describe("checkAgents", () => {
  it("passes when every route resolves and every file is within budget", () => {
    const root = repo({
      "AGENTS.md": router("| Unit | `packages/a/AGENTS.md` |"),
      "packages/a/AGENTS.md": lines(UNIT_BUDGET),
    });

    expect(check(root)).toEqual({ code: 0, output: "OK: 1 routes resolve and every AGENTS.md is within budget." });
  });

  it("fails on a missing target", () => {
    const { code, output } = check(repo({ "AGENTS.md": router("| Bug fix | `gone.md` |") }));

    expect(code).toBe(1);
    expect(output).toContain('"Bug fix" routes to a missing path: gone.md');
  });

  it("fails on a row without a concrete target", () => {
    const { code, output } = check(repo({ "AGENTS.md": router("| Bug fix | read the code |") }));

    expect(code).toBe(1);
    expect(output).toContain('"Bug fix" has no concrete target');
  });

  it("fails without a router table", () => {
    const { code, output } = check(repo({ "AGENTS.md": "# no router\n" }));

    expect(code).toBe(1);
    expect(output).toContain("AGENTS.md has no | Task | Read | table");
  });

  it("holds the root and unit files to their own budgets", () => {
    const route = "| Unit | `README.md` |";
    const within = `${router(route)}${lines(ROOT_BUDGET - 3)}\n`;
    const over = `${router(route)}${lines(ROOT_BUDGET - 2)}\n`;

    expect(check(repo({ "AGENTS.md": within, "README.md": "" })).code).toBe(0);
    expect(check(repo({ "AGENTS.md": over, "README.md": "" })).output).toContain(
      `AGENTS.md has ${ROOT_BUDGET + 1} lines (budget ${ROOT_BUDGET})`,
    );

    const unit = check(repo({ "AGENTS.md": router(route), "README.md": "", "a/AGENTS.md": lines(UNIT_BUDGET + 1) }));
    expect(unit.code).toBe(1);
    expect(unit.output).toContain(`${path.join("a", "AGENTS.md")} has ${UNIT_BUDGET + 1} lines (budget ${UNIT_BUDGET})`);
  });
});

describe("the script", () => {
  it("passes on this repository", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    await import("../scripts/check-agents.mjs");

    expect(log.mock.calls.flat().join("\n")).toContain("OK:");
    expect(process.exitCode).toBe(0);
  });
});
