import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const repo = fileURLToPath(new URL("../../", import.meta.url));

// The prototype's own tests (screen navigation). The repository's root Vitest config only collects
// packages/*, so these are run from here with `npm test` and are not part of the coverage gate.
export default defineConfig({
  oxc: { jsx: { runtime: "automatic" } },
  resolve: { alias: [{ find: /^zod$/, replacement: `${repo}packages/ui/node_modules/zod/index.js` }] },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/test-setup.ts"],
    restoreMocks: true,
  },
});
