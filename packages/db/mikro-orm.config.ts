// Entry point for the MikroORM CLI only (migrations, seeding, schema, debug).
// The app imports `src/config.ts` directly and gets env vars from Next.js.
import { fileURLToPath } from "node:url";

import nextEnv from "@next/env";

// Load the same .env files Next.js uses (they live in packages/app),
// with the same precedence, so CLI and app always agree on DATABASE_URL.
nextEnv.loadEnvConfig(fileURLToPath(new URL("../app", import.meta.url)));

const { default: config } = await import("./src/config");

export default config;
