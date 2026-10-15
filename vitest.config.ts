import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const aliases = {
  "@": fileURLToPath(new URL("./packages/app/src", import.meta.url)),
  "server-only": fileURLToPath(new URL("./tests/empty.ts", import.meta.url)),
};

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias: aliases },
        test: {
          name: "node",
          environment: "node",
          include: ["packages/*/src/**/*.test.ts", "tests/**/*.test.ts"],
          restoreMocks: true,
          unstubEnvs: true,
          unstubGlobals: true,
        },
      },
      {
        resolve: { alias: aliases },
        test: {
          name: "dom",
          environment: "jsdom",
          include: ["packages/*/src/**/*.test.tsx"],
          setupFiles: ["./tests/setup-dom.ts"],
          restoreMocks: true,
          unstubEnvs: true,
          unstubGlobals: true,
        },
      },
    ],
    coverage: {
      provider: "v8",
      include: ["packages/*/src/**/*.{ts,tsx}", "scripts/**/*.mjs", "eslint.config.mjs"],
      exclude: ["**/*.test.{ts,tsx}", "**/*.d.ts"],
      reporter: ["text", "html", "lcov", "json-summary"],
      thresholds: { perFile: true, lines: 100, statements: 100, functions: 100, branches: 100 },
    },
  },
});
