import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

export const ROOT_BUDGET = 150;
export const UNIT_BUDGET = 120;

const SKIPPED_DIRS = new Set([
  ".agents",
  ".claude",
  ".git",
  ".grok",
  ".next",
  "coverage",
  "node_modules",
  "storybook-static",
  "test-results",
]);

// Every AGENTS.md under `dir`, skipping tool state and generated output.
export function listAgentFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return SKIPPED_DIRS.has(entry.name) ? [] : listAgentFiles(entryPath);
    return entry.name === "AGENTS.md" ? [entryPath] : [];
  });
}

// One `{ task, targets }` per row of the `| Task | Read |` table; targets are the backticked paths.
export function parseRoutes(markdown) {
  const lines = markdown.split("\n");
  const header = lines.findIndex((line) => /^\|\s*Task\s*\|\s*Read\s*\|\s*$/.test(line));
  if (header === -1) return [];

  const rows = [];
  for (const line of lines.slice(header + 2)) {
    if (!line.startsWith("|")) break;
    const [, task, read] = line.split("|");
    rows.push({ task: task.trim(), targets: [...read.matchAll(/`([^`]+)`/g)].map((match) => match[1]) });
  }
  return rows;
}

export function checkAgents(root, log) {
  const rootFile = path.join(root, "AGENTS.md");
  const routes = parseRoutes(readFileSync(rootFile, "utf8"));
  const errors = routes.length === 0 ? ["AGENTS.md has no | Task | Read | table"] : [];

  for (const { task, targets } of routes) {
    if (targets.length === 0) errors.push(`"${task}" has no concrete target`);
    for (const target of targets) {
      if (!existsSync(path.join(root, target))) errors.push(`"${task}" routes to a missing path: ${target}`);
    }
  }

  for (const file of listAgentFiles(root)) {
    const lines = readFileSync(file, "utf8").trimEnd().split("\n").length;
    const budget = file === rootFile ? ROOT_BUDGET : UNIT_BUDGET;
    if (lines > budget) errors.push(`${path.relative(root, file)} has ${lines} lines (budget ${budget})`);
  }

  if (errors.length > 0) {
    log(`Error: agent instructions failed ${errors.length} check(s)\n${errors.map((error) => `  ${error}`).join("\n")}`);
    return 1;
  }
  log(`OK: ${routes.length} routes resolve and every AGENTS.md is within budget.`);
  return 0;
}
