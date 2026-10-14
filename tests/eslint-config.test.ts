import { fileURLToPath } from "node:url";

import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const eslint = new ESLint({ cwd: fileURLToPath(new URL("..", import.meta.url)) });

async function boundaryErrors(packageName: string, dependency: string) {
  const [result] = await eslint.lintText(`import * as dependency from "${dependency}"; void dependency;`, {
    filePath: `packages/${packageName}/src/boundary-fixture.ts`,
  });
  expect(result).toBeDefined();
  return result!.messages.filter(({ ruleId }) => ruleId === "no-restricted-imports");
}

describe("package boundary lint rules introduced by PR #2", () => {
  it.each([
    ["core", "@devmentor/ui/components/button"],
    ["core", "react"],
    ["core", "react-dom/client"],
    ["core", "next/server"],
    ["core", "@mikro-orm/core"],
    ["db", "@devmentor/app"],
    ["db", "@devmentor/ui/components/button"],
    ["db", "react/jsx-runtime"],
    ["db", "next/server"],
    ["ui", "@devmentor/app"],
    ["ui", "@devmentor/core"],
    ["ui", "@devmentor/db"],
    ["ui", "@mikro-orm/postgresql"],
    ["app", "@mikro-orm/postgresql"],
  ])("rejects %s importing %s", async (packageName, dependency) => {
    expect(await boundaryErrors(packageName, dependency)).toHaveLength(1);
  });

  it.each([
    ["core", "awilix"],
    ["core", "zod"],
    ["db", "@devmentor/core"],
    ["db", "@mikro-orm/postgresql"],
    ["ui", "react"],
    ["ui", "@devmentor/ui/components/button"],
    ["app", "@devmentor/core"],
    ["app", "@devmentor/db"],
    ["app", "@devmentor/ui/components/button"],
    ["app", "next/server"],
  ])("allows %s importing %s", async (packageName, dependency) => {
    expect(await boundaryErrors(packageName, dependency)).toEqual([]);
  });

  it("resolves Next.js lint rules against the app workspace", async () => {
    const config = await eslint.calculateConfigForFile("packages/app/src/app/backend/page.tsx");
    expect(config.settings.next.rootDir).toBe("packages/app/");
    expect(config.rules["@next/next/no-html-link-for-pages"][0]).toBe(2);
  });

  it.each([
    "packages/app/.next/server/page.js",
    "packages/app/out/index.html",
    "packages/app/build/output.js",
    "packages/app/next-env.d.ts",
    "packages/db/src/migrations/Migration20261013225312.ts",
    "coverage/index.html",
    "test-results/integration/browser.log",
  ])("ignores generated output %s", async (path) => {
    expect(await eslint.isPathIgnored(path)).toBe(true);
  });
});
