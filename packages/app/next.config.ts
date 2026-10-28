import type { NextConfig } from "next";

import { TOKEN_PAGE_HEADERS } from "./src/app/token-page";

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
    // Node-only SMTP client (net/tls/fs); load it from node_modules at runtime.
    "nodemailer",
  ],

  // Token pages carry a raw token in their address: no referrer, no caching,
  // no indexing (src/app/token-page.ts; the page metadata repeats the
  // referrer and robots rules in meta tags). Phase 3 adds /invite/:token.
  async headers() {
    return [{ source: "/confirm-email", headers: TOKEN_PAGE_HEADERS }];
  },
};

export default nextConfig;
