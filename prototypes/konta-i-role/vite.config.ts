import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const here = fileURLToPath(new URL(".", import.meta.url));
const repo = fileURLToPath(new URL("../../", import.meta.url));

// The result is served by Storybook (packages/ui/.storybook/public is its static dir) at
// /prototypes/konta-i-role/index.html. That folder is git-ignored and also holds nothing of ours
// that a build may delete, so emptyOutDir stays off and file names are stable (no hashes).
export default defineConfig({
  root: here,
  base: "./",
  plugins: [tailwindcss()],
  oxc: { jsx: { runtime: "automatic" } },
  resolve: {
    alias: [
      // The repo root has zod 3; @devmentor/ui and its schemas need zod 4 (see AGENTS.md, Gotchas).
      { find: /^zod$/, replacement: `${repo}packages/ui/node_modules/zod/index.js` },
    ],
  },
  server: { fs: { allow: [repo] } },
  build: {
    outDir: `${repo}packages/ui/.storybook/public/prototypes/konta-i-role`,
    emptyOutDir: false,
    rollupOptions: {
      // Design-system components carry "use client" for Next.js; it means nothing in this bundle.
      onwarn(warning, warn) {
        if (warning.code !== "MODULE_LEVEL_DIRECTIVE") warn(warning);
      },
      output: {
        entryFileNames: "assets/app.js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
});
