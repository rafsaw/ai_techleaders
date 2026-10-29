import type { NextConfig } from "next";

import { TOKEN_PAGE_HEADERS, TOKEN_PAGES } from "./src/app/token-page";

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

  // Token pages carry a raw token in their address, or can carry one in a
  // `returnTo` (the auth pages keep an invitation's /invite/<token>): no
  // referrer, no caching, no indexing, whatever the query
  // (src/app/token-page.ts; the page metadata repeats the referrer and robots
  // rules in meta tags).
  async headers() {
    return TOKEN_PAGES.map((source) => ({ source, headers: TOKEN_PAGE_HEADERS }));
  },
};

export default nextConfig;
