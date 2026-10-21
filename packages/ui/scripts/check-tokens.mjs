#!/usr/bin/env node
// Finds values that bypass the design tokens and exits 1 if any are found (usable in CI):
//   - colours written outside the token file (hex, rgb/hsl/oklch/oklab/lab/lch/hwb, color-mix),
//   - Tailwind palette classes (bg-zinc-900, text-white, …),
//   - Tailwind arbitrary values (p-[13px], rounded-[min(…)], p-(--x), [prop:value]).
//     Bracketed variants (has-[…]:, data-[…]:, [&_svg]:) are selectors, not values, and are allowed.
// Scope: packages/ui/src and packages/ui/.storybook, except the token file.
// packages/app/src is reported for information only (POSTEP.md, Z-5) and never fails the run.
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PALETTE =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const PROPS =
  "bg|text|border(?:-[trblxyse])?|ring(?:-offset)?|outline|fill|stroke|from|via|to|decoration|divide|shadow|accent|caret|placeholder|inset-shadow|inset-ring";

const RULES = [
  { kind: "hex colour", re: /(?<![\w&#/])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g },
  { kind: "colour function", re: /\b(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb|color-mix)\(/g },
  {
    kind: "Tailwind palette class",
    re: new RegExp(`(?<![\\w-])(?:${PROPS})-(?:(?:${PALETTE})-(?:50|[1-9]00|950)|white|black)(?:\\/\\d+)?(?![\\w-])`, "g"),
  },
];

const SOURCE_EXT = new Set([".ts", ".tsx", ".js", ".mjs", ".css", ".mdx"]);

/** Removes inline code and fenced code from MDX so documented examples of what to avoid are not reported. */
export function stripMdxCode(text) {
  return text
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/[^\n]/g, " "))
    .replace(/`[^`\n]*`/g, (code) => " ".repeat(code.length));
}

/** Splits a line into class-like tokens, keeping bracketed parts ([…], (…)) whole. */
export function splitTokens(line) {
  const tokens = [];
  let depth = 0;
  let start = -1;
  for (let i = 0; i <= line.length; i++) {
    const ch = line[i];
    // "(" groups only inside brackets or in the p-(--x) form, so cn("…") still splits.
    if (ch === "[" || (ch === "(" && (depth > 0 || line[i - 1] === "-"))) depth++;
    else if ((ch === "]" || ch === ")") && depth > 0) depth--;
    const boundary = ch === undefined || (depth === 0 && /[\s"'`{}]/.test(ch));
    if (boundary) {
      if (start >= 0) tokens.push({ text: line.slice(start, i), index: start });
      start = -1;
    } else if (start < 0) {
      start = i;
    }
  }
  return tokens;
}

/** Returns the utility part of a class (after the last top-level variant colon). */
export function utilityOf(token) {
  let depth = 0;
  let last = 0;
  for (let i = 0; i < token.length; i++) {
    const ch = token[i];
    if (ch === "[" || ch === "(") depth++;
    else if (ch === "]" || ch === ")") depth--;
    else if (ch === ":" && depth === 0) last = i + 1;
  }
  return token.slice(last).replace(/^[!-]+|!$/g, "");
}

/** True when a utility carries an arbitrary value: p-[13px], p-(--x) or an arbitrary property [x:y]. */
export function isArbitrary(utility) {
  return /^[a-z][\w-]*-(?:\[[^\]]|\(--)/.test(utility) || /^\[[\w-]+:.+\]$/.test(utility);
}

/** Returns findings for one file's text. */
export function scanText(text, file) {
  const source = file.endsWith(".mdx") ? stripMdxCode(text) : text;
  const findings = [];
  source.split("\n").forEach((line, index) => {
    for (const { kind, re } of RULES) {
      for (const match of line.matchAll(re)) {
        findings.push({ file, line: index + 1, column: match.index + 1, kind, value: match[0] });
      }
    }
    for (const token of splitTokens(line)) {
      if (isArbitrary(utilityOf(token.text))) {
        findings.push({ file, line: index + 1, column: token.index + 1, kind: "Tailwind arbitrary value", value: token.text });
      }
    }
  });
  return findings;
}

/** Lists source files under a directory, skipping tests, generated files and dependencies. */
export function listFiles(dir, ignore = () => false) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (ignore(full)) continue;
    if (statSync(full).isDirectory()) {
      if (name !== "node_modules" && name !== "public") files.push(...listFiles(full, ignore));
    } else if (SOURCE_EXT.has(path.extname(name)) && !/\.test\.tsx?$/.test(name) && !name.endsWith(".d.ts")) {
      files.push(full);
    }
  }
  return files;
}

export function format(findings, root) {
  return findings.map((f) => `${path.relative(root, f.file)}:${f.line}:${f.column}  ${f.kind}  ${f.value}`).join("\n");
}

export function run({ root, log = console.log }) {
  const ui = path.join(root, "packages/ui");
  const tokenFile = path.join(ui, "src/styles/globals.css");
  const scan = (files) => files.flatMap((file) => scanText(readFileSync(file, "utf8"), file));

  const errors = scan([
    ...listFiles(path.join(ui, "src"), (file) => file === tokenFile),
    ...listFiles(path.join(ui, ".storybook")),
  ]);
  const appDir = path.join(root, "packages/app/src");
  const info = scan(listFiles(appDir));

  if (info.length > 0) {
    log(`Info, not failing (packages/app, see POSTEP.md Z-5): ${info.length} value(s) outside tokens\n${format(info, root)}\n`);
  }
  if (errors.length > 0) {
    log(`Error: ${errors.length} value(s) outside tokens in packages/ui\n${format(errors, root)}`);
    return 1;
  }
  log("OK: no values outside tokens in packages/ui.");
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
  process.exitCode = run({ root });
}
