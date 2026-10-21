import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  format,
  isArbitrary,
  listFiles,
  run,
  scanText,
  splitTokens,
  stripMdxCode,
  utilityOf,
} from "../packages/ui/scripts/check-tokens.mjs";

const kinds = (text: string, file = "x.tsx") => scanText(text, file).map((f: { kind: string; value: string }) => `${f.kind}: ${f.value}`);

describe("scanText", () => {
  it("reports hex colours and colour functions", () => {
    expect(kinds('const a = "#fff"; const b = "#1b1b1bff"')).toEqual(["hex colour: #fff", "hex colour: #1b1b1bff"]);
    expect(kinds("color: oklch(0.5 0 0); x: rgb(0 0 0); y: color-mix(in oklch, a, b)")).toEqual([
      "colour function: oklch(",
      "colour function: rgb(",
      "colour function: color-mix(",
    ]);
  });

  it("does not treat anchors or entities as colours", () => {
    expect(kinds('<a href="/page#add">x</a> &#123;')).toEqual([]);
  });

  it("reports Tailwind palette classes, including white, black and opacity", () => {
    expect(kinds('className="bg-zinc-900 text-white hover:border-purple-500/50 text-black"')).toEqual([
      "Tailwind palette class: bg-zinc-900",
      "Tailwind palette class: text-white",
      "Tailwind palette class: border-purple-500/50",
      "Tailwind palette class: text-black",
    ]);
  });

  it("accepts token classes", () => {
    expect(kinds('className="bg-primary text-muted-foreground border-border p-panel rounded-panel gap-in-group"')).toEqual([]);
  });

  it("reports arbitrary values but allows bracketed variants", () => {
    expect(kinds('"p-[13px] hover:bg-[color-mix(in_oklch,var(--a),var(--b)_5%)] gap-(--x) [--y:1px]"')).toEqual([
      "colour function: color-mix(",
      "Tailwind arbitrary value: p-[13px]",
      "Tailwind arbitrary value: hover:bg-[color-mix(in_oklch,var(--a),var(--b)_5%)]",
      "Tailwind arbitrary value: gap-(--x)",
      "Tailwind arbitrary value: [--y:1px]",
    ]);
    expect(
      kinds(`"has-[>[data-slot=field]]:gap-4 group-has-[>svg]/alert:pl-2 [&_svg:not([class*='size-'])]:size-4 data-[size=sm]:p-2"`),
    ).toEqual([]);
  });

  it("ignores inline and fenced code in MDX only", () => {
    const mdx = "Avoid `bg-zinc-900` here.\n```tsx\n<div className=\"p-[13px]\" />\n```\nBut not bg-zinc-900.";
    expect(scanText(mdx, "a.mdx")).toEqual([
      { file: "a.mdx", line: 5, column: 9, kind: "Tailwind palette class", value: "bg-zinc-900" },
    ]);
    expect(kinds("`bg-zinc-900`", "a.tsx")).toEqual(["Tailwind palette class: bg-zinc-900"]);
    expect(stripMdxCode("a `b` c")).toBe("a     c");
  });
});

describe("helpers", () => {
  it("splits tokens without breaking bracketed parts", () => {
    expect(splitTokens(`cn("a [&_b:not([c='d e'])]:x")`).map((t: { text: string }) => t.text)).toEqual([
      "cn(",
      "a",
      "[&_b:not([c='d e'])]:x",
      ")",
    ]);
  });

  it("finds the utility after the last top-level variant", () => {
    expect(utilityOf("md:hover:bg-[a:b]")).toBe("bg-[a:b]");
    expect(utilityOf("!-mt-2")).toBe("mt-2");
    expect(isArbitrary("mt-2")).toBe(false);
    expect(isArbitrary("[mask-type:luminance]")).toBe(true);
  });

  it("formats findings relative to the root", () => {
    expect(format([{ file: "/r/a.tsx", line: 1, column: 2, kind: "k", value: "v" }], "/r")).toBe("a.tsx:1:2  k  v");
  });
});

describe("run", () => {
  let root: string;

  afterEach(() => rmSync(root, { recursive: true, force: true }));

  const setup = (files: Record<string, string>) => {
    root = mkdtempSync(path.join(tmpdir(), "check-tokens-"));
    for (const dir of ["packages/ui/src/styles", "packages/ui/.storybook/public", "packages/app/src", "packages/ui/src/node_modules"]) {
      mkdirSync(path.join(root, dir), { recursive: true });
    }
    for (const [file, text] of Object.entries(files)) writeFileSync(path.join(root, file), text);
  };

  it("passes when only the token file holds raw values and reports the app without failing", () => {
    setup({
      "packages/ui/src/styles/globals.css": ":root { --a: oklch(0.5 0 0); }",
      "packages/ui/src/ok.tsx": 'export const c = "bg-primary";',
      "packages/ui/src/ok.test.tsx": 'const c = "#fff";',
      "packages/ui/src/types.d.ts": 'type C = "#fff";',
      "packages/ui/src/notes.txt": "#fff",
      "packages/ui/src/node_modules/x.ts": "#fff",
      "packages/ui/.storybook/public/worker.js": "#fff",
      "packages/app/src/page.tsx": 'const c = "text-white";',
    });
    const lines: string[] = [];
    expect(run({ root, log: (line: string) => lines.push(line) })).toBe(0);
    expect(lines.join("\n")).toContain("packages/app/src/page.tsx:1:12  Tailwind palette class  text-white");
    expect(lines.at(-1)).toBe("OK: no values outside tokens in packages/ui.");
  });

  it("fails with file and line for values outside tokens", () => {
    setup({
      "packages/ui/src/styles/globals.css": "",
      "packages/ui/src/bad.tsx": '\nconst c = "p-[13px]";',
      "packages/ui/.storybook/blocks.tsx": 'const c = "#000";',
    });
    const lines: string[] = [];
    expect(run({ root, log: (line: string) => lines.push(line) })).toBe(1);
    expect(lines.join("\n")).toContain("packages/ui/src/bad.tsx:2:12  Tailwind arbitrary value  p-[13px]");
    expect(lines.join("\n")).toContain("packages/ui/.storybook/blocks.tsx:1:12  hex colour  #000");
    expect(listFiles(path.join(root, "packages/ui/src")).map((file: string) => path.basename(file)).sort()).toEqual(["bad.tsx", "globals.css"]);
  });
});
