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
    // Node-only SMTP client (net/tls/fs); load it from node_modules at runtime.
    "nodemailer",
  ],

  // The confirmation token is in /confirm-email's address: never send it on
  // as a referrer (the page's metadata sets the same policy in a meta tag).
  async headers() {
    return [{ source: "/confirm-email", headers: [{ key: "Referrer-Policy", value: "no-referrer" }] }];
  },
};

export default nextConfig;
