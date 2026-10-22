import path from "node:path";
import { fileURLToPath } from "node:url";

import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const dirname = path.dirname(fileURLToPath(import.meta.url));

// Runs every story as a test (play functions and a11y checks) in Chromium.
// Separate from the root unit-test config and its coverage gate.
export default defineConfig({
  plugins: [storybookTest({ configDir: path.join(dirname, ".storybook") })],
  // Pre-bundle the dependencies stories import, so Vite does not reload mid-run.
  optimizeDeps: {
    include: [
      "cn/config",
      "class-variance-authority",
      "lucide-react",
      "@base-ui/react/button",
      "@base-ui/react/input",
      "@base-ui/react/merge-props",
      "@base-ui/react/use-render",
      "@base-ui/react/alert-dialog",
      "@base-ui/react/separator",
      "zod",
      "@storybook/addon-docs",
      "@storybook/addon-docs/blocks",
      "@storybook/react-dom-shim",
      "storybook/theming",
    ],
  },
  test: {
    name: "storybook",
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: "chromium" }],
    },
  },
});
