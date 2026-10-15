import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workspace packages (@devmentor/*) ship TypeScript source and are
  // transpiled by Turbopack automatically — no transpilePackages needed.

  // MikroORM is Node-only and loads drivers/extensions at runtime, so it must
  // not be bundled. Next's built-in list only covers @mikro-orm/core and the
  // v6-era @mikro-orm/knex, so the v7 packages are listed explicitly.
  serverExternalPackages: [
    "@mikro-orm/postgresql",
    "@mikro-orm/sql",
    "@mikro-orm/migrations",
    "@mikro-orm/seeder",
  ],
};

export default nextConfig;
