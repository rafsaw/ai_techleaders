import "server-only";

import { defineConfigSection, type EnvSource } from "@devmentor/core";
import { z } from "zod";

const httpUrl = z.url({ protocol: /^https?$/ });

const appSection = z
  .object({ APP_URL: httpUrl })
  .transform((env) => ({ url: new URL(env.APP_URL) }));

const githubSection = z
  .object({
    GITHUB_CLIENT_ID: z.string(),
    GITHUB_CLIENT_SECRET: z.string(),
    // Overridable so integration tests can point OAuth at a local stub.
    GITHUB_OAUTH_URL: httpUrl.default("https://github.com"),
    GITHUB_API_URL: httpUrl.default("https://api.github.com"),
  })
  .transform((env) => ({
    clientId: env.GITHUB_CLIENT_ID,
    clientSecret: env.GITHUB_CLIENT_SECRET,
    oauthUrl: new URL(env.GITHUB_OAUTH_URL),
    apiUrl: new URL(env.GITHUB_API_URL),
  }));

const emailSection = z
  .object({
    // smtp://[user:pass@]host:port (STARTTLS when offered) or smtps:// (TLS).
    SMTP_URL: z.url({ protocol: /^smtps?$/ }),
    // A sender address, optionally with a name: `DevMentor <no-reply@example.com>`.
    MAIL_FROM: z.string().trim().min(1),
  })
  .transform((env) => ({ smtpUrl: env.SMTP_URL, from: env.MAIL_FROM }));

/**
 * Application configuration, one lazily validated section per concern. A
 * section is read on first use, so `next build` and pages that do not need it
 * work without its variables; a missing key throws `ConfigError`.
 */
export interface AppConfig {
  app: () => z.output<typeof appSection>;
  github: () => z.output<typeof githubSection>;
  email: () => z.output<typeof emailSection>;
}

export function createAppConfig(source: EnvSource = process.env): AppConfig {
  return {
    app: defineConfigSection(appSection, source),
    github: defineConfigSection(githubSection, source),
    email: defineConfigSection(emailSection, source),
  };
}
