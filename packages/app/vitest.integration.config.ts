import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  root: fileURLToPath(new URL("../..", import.meta.url)),
  // Lets a scenario drive a server-side adapter directly (e.g. the SMTP sender).
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    name: "integration",
    environment: "node",
    include: ["packages/app/tests/integration/**/*.test.ts"],
    globalSetup: ["packages/app/tests/integration/global-setup.ts"],
    fileParallelism: false,
    sequence: { concurrent: false },
    maxWorkers: 1,
    testTimeout: 120_000,
    hookTimeout: 60_000,
    reporters: ["default", "junit"],
    outputFile: { junit: "test-results/integration/junit.xml" },
  },
});
