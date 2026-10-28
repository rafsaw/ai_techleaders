# DevMentor

A project for tech leaders who use AI in their teams' daily work.

DevMentor is a Next.js + TypeScript monorepo backed by PostgreSQL. Coding
agents should read [`AGENTS.md`](./AGENTS.md) first: it holds the binding
architecture rules this README explains.

## Getting started

Prerequisites: **Node.js ≥ 22.17** (MikroORM v7 requirement) and **npm**. Run
`npm run setup` from the repository root to install dependencies, start the
database, create the env file and apply migrations; see
[Local setup](#local-setup) below.

- `/` is the public frontend (Tailwind).
- `/sign-in` signs in with GitHub or with email and password; `/sign-up`
  creates an email account, confirmed through an emailed link (see
  [Email sign-up locally](#email-sign-up-locally)); `/account` is the
  signed-in area.
- `/backend` is the admin area (shadcn/ui), open only to accounts holding
  the `operator` role (see [Operator role](#operator-role)). It also shows
  the database connection status.

## Local setup

### Quick setup

```bash
npm run setup
```

Run it from the repository root. It runs manual steps 1–5 below in order and
prints one line per step:

- **Prerequisites:** Node ≥ 22.17, plus Docker and the Compose plugin.
- **Dependencies:** `npm install`.
- **PostgreSQL and Mailpit:** `docker compose up -d --wait`.
- **Env:** copies `packages/app/.env.example` to `packages/app/.env`.
- **Migrations:** `npm run db:migrate`.

Each step first checks whether it is already done and reports
`↷ skipped` if so. That makes `npm run setup` safe to re-run at any time,
for example after a `git pull`: it only does what is missing. It never
overwrites an existing `packages/app/.env`. On a failure it stops with
`✖ <step> — failed: … → <fix>` and exits non-zero. It does not seed sample
data or start the app: run `npm run db:seed` (optional, step 6) and then
`npm run dev`.

**Without Docker** (e.g. the course Sandbox, or your own PostgreSQL), export
`DATABASE_URL` for the run, for example
`DATABASE_URL=postgres://… npm run setup`. Setup then skips Docker and `.env`
creation and migrates that database. A `DATABASE_URL` that is only in a
`packages/app/.env*` file does not count: export it.

### Manual setup (alternative)

The same steps, by hand.

#### 1. Prerequisites

- **Node.js ≥ 22.17** and npm.
- **Docker**: Docker Desktop on Windows. If you work in WSL, enable
  Settings -> Resources -> WSL integration for your distro.
- Keep the repo in the WSL filesystem (e.g. `~/projects`), not under `/mnt/c`.

#### 2. Install dependencies

Run from the repo root; it installs all workspaces:

```bash
npm install
```

#### 3. Start PostgreSQL

```bash
docker compose up -d
docker compose ps
```

Wait until the status is `healthy`. `docker-compose.yml` defines user,
password and database `devmentor` on port 5432. If port 5432 is taken, change
the host port mapping (e.g. `"5433:5432"`) and use the same port in
`DATABASE_URL`.

The same command starts **Mailpit**, a local SMTP sink: the app sends email to
`smtp://localhost:1025`, and every message lands in the inbox at
<http://localhost:8025> instead of a real mailbox. No external account is
needed. Confirmation and "you already have an account" emails appear there
within a second of the sign-up; open one and follow its link (it points at
`APP_URL`, so the app must run on that origin).

#### 4. Configure env

Create `packages/app/.env` (not in the repo root: the MikroORM CLI in
`packages/db` loads env files from `packages/app` via `@next/env`, and
Next.js reads them from there too) with a single variable:

```bash
DATABASE_URL=postgres://devmentor:devmentor@127.0.0.1:5432/devmentor
```

You can copy the template instead (it already matches `docker-compose.yml`):

```bash
cp packages/app/.env.example packages/app/.env
```

The file is git-ignored and must never be committed. `DATABASE_URL` is the
only variable needed to boot; `DB_HOST`/`DB_USER`-style variables are not
supported. Optional: `DB_POOL_MIN`, `DB_POOL_MAX`, `DB_DEBUG`.

Other settings are grouped into sections (`packages/app/src/server/config.ts`)
that are validated lazily: a section is read the first time a feature uses it,
so the app builds and boots without it, and only that feature fails, logging
a `ConfigError` that names the missing or invalid variables (never their
values).

| Variable | Section | Required | Purpose |
| -------- | ------- | -------- | ------- |
| `APP_URL` | `app` | for absolute links and redirects | Public origin, e.g. `http://localhost:3000`; https in production |
| `TRUST_PROXY` | `app` | no (default `false`) | `true` only behind an edge that replaces `X-Forwarded-For` with one validated client address and blocks direct origin access; enables per-IP rate limits (see [Trusted edge](#trusted-edge-and-trust_proxy)). Any value other than `true`/`false` is a `ConfigError` |
| `GITHUB_CLIENT_ID` | `github` | for GitHub sign-in | OAuth App client id |
| `GITHUB_CLIENT_SECRET` | `github` | for GitHub sign-in | OAuth App client secret |
| `GITHUB_OAUTH_URL` | `github` | no (default `https://github.com`) | OAuth endpoint override for test stubs |
| `GITHUB_API_URL` | `github` | no (default `https://api.github.com`) | API endpoint override for test stubs |
| `SMTP_URL` | `email` | for sending email | `smtp://[user:pass@]host:port` (STARTTLS when offered) or `smtps://…` (TLS); local Mailpit: `smtp://localhost:1025` |
| `MAIL_FROM` | `email` | for sending email | Sender, e.g. `DevMentor <no-reply@example.com>` (quote it in `.env` files) |

The `.env.example` values (`SMTP_URL=smtp://localhost:1025`, a localhost
`MAIL_FROM`, `TRUST_PROXY=false`) work with the Compose Mailpit as they are.
Without `SMTP_URL`/`MAIL_FROM` the app still boots; sign-up and resend then
log a `ConfigError` and fail with a 500 (the account and its link are kept).

**GitHub OAuth App for local sign-in.** In GitHub, open Settings → Developer
settings → OAuth Apps → New OAuth App. Set the homepage URL to
`http://localhost:3000` and the authorization callback URL to
`http://localhost:3000/api/auth/github/callback`, then copy the client id and
a generated client secret into `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`.

Both loaders read files from `packages/app`. Existing `process.env` values
win over all files. Files are loaded in the order below; for each variable,
the first file defining it wins (missing files are skipped):

| Command | File load order, highest priority first |
| ------- | -------------------------------------- |
| `npm run dev` (development mode) | `.env.development.local` → `.env.local` → `.env.development` → `.env` |
| `npm run build` (production mode) | `.env.production.local` → `.env.local` → `.env.production` → `.env` |
| `npm run db:migrate`, `npm run db:seed` and the other `db:*` scripts (unless `NODE_ENV=test`) | `.env.production.local` → `.env.local` → `.env.production` → `.env` |

The CLI wrapper calls `loadEnvConfig` without the development argument, so
it selects production files even when `NODE_ENV=development`. With
`NODE_ENV=test`, the loader instead reads `.env.test.local` → `.env.test` →
`.env`, skipping `.env.local`. Thus `.env.local` overrides `.env` outside
test mode, but mode-specific files can make the app and CLI use different
values.

#### 5. Run migrations

```bash
npm run db:migrate
npm run db:migration:list   # optional: verify
```

To roll back the last applied migration, use:

```bash
npm run db:migrate:down
```

This delegates to `mikro-orm migration:down` and requires that migration to
implement `down()`. The current initial migration,
`Migration20261013225312`, implements only `up()`; attempting to revert it
throws `This migration cannot be reverted`.

#### 6. Seed sample data (optional)

```bash
npm run db:seed
```

This adds one sample user, Ada Lovelace (`ada@devmentor.dev`), so
`/backend/users` isn't empty. It is safe to re-run: if a user with that email
already exists, the seeder leaves it unchanged and creates no duplicate. Run it
after `npm run db:migrate`; on a database without the `users` table it fails
with `relation "users" does not exist`.

#### 7. Start the app

```bash
npm run dev
```

Open http://localhost:3000. Backend pages are under `/backend`; the users
panel is at `/backend/users`.

### Release email test

A green test suite proves only that an SMTP server **accepted** the message
(that is all `EmailSender` reports, platform P10). Before a release that
sends email, check delivery to a real inbox against the production
provider (platform PD1):

1. Configure the production `SMTP_URL` and `MAIL_FROM` (a sender domain the
   provider has verified, with SPF/DKIM in place).
2. Sign up on the release build with a real mailbox you control, ideally one
   each at two large providers.
3. Confirm that the message arrives in the inbox (not spam), the sender is
   right, and the link opens `/confirm-email` on the production `APP_URL` and
   confirms the account.
4. Record the result (date, provider, mailbox domains, pass/fail) in the
   release notes, without the link or its token: tokens never go into
   evidence or logs.

### Trusted edge and `TRUST_PROXY`

Next.js route handlers do not see the socket address, so the client IP comes
only from `X-Forwarded-For`, and only when `TRUST_PROXY=true`. With the
default `false`, the per-IP rate limits (sign-in/confirm 10 per 15 minutes,
sign-up 5 per hour) are **skipped**; the per-address limits still apply.

Set `TRUST_PROXY=true` only when both hold:

- the edge (load balancer, CDN or reverse proxy) **overwrites** any inbound
  `X-Forwarded-For` with exactly one address, the client it validated, and
  never appends to a client-supplied value;
- the app's origin cannot be reached except through that edge (private
  network, firewall or an origin secret), so nobody can send their own
  header straight to the app.

The app treats a list, a port, brackets, a zone id or anything that is not a
single IP address as unknown, which again skips the per-IP rules. If the
chosen hosting cannot give this contract, keep `TRUST_PROXY=false` and add a
trusted-IP adapter through a spec instead.

### Daily workflow

Make sure Docker is running, then:

```bash
docker compose up -d
npm run dev
```

Stop the database with `docker compose down`. Data is kept in the `pgdata`
volume.

### Operator role

Every account gets the `mentee` role on sign-up. The `operator` role, which
opens `/backend` and `/api/users`, is granted and revoked only from the
command line, against the database in `DATABASE_URL` (env is loaded from
`packages/app` like the app does). The account must already exist, so sign
in once with GitHub first:

```bash
npm run operator -- role grant  --email you@example.com --role operator
npm run operator -- role revoke --email you@example.com --role operator
```

- The change is live on the account's **next request**: roles are read from
  the database on every request, so there is no need to sign out or in, and
  revoking leaves the session signed in (it just loses `/backend`).
- Both commands are idempotent ("already holds operator" / "does not hold
  operator; nothing changed").
- Only `--role operator` is accepted; `mentor` comes only from an
  invitation.
- The command prints the database host first. With `NODE_ENV=production`
  it refuses to run unless you add `--yes`.
- Exit codes: `0` success, `1` refused or failed (e.g. no account with that
  email), `2` usage error. `npm run operator -- help` lists the commands.

### Email sign-up locally

With `docker compose up -d` and `npm run dev` running:

1. Open <http://localhost:3000/sign-up>, enter a display name, any email
   address (nothing leaves your machine) and a password of at least 15
   characters. You land on "Check your inbox at …".
2. Signing in at `/sign-in` now answers "Confirm your email first" with
   **Resend confirmation**; each resend sends a new link and the older ones
   stop working.
3. Open <http://localhost:8025>, open the newest "Confirm your email address
   for DevMentor" message and follow its link to `/confirm-email`.
4. Enter the same password and press **Confirm**: you are signed in, and
   `/account` lists "Email and password" as a sign-in method.

Limits apply locally too: 5 sign-in/confirm attempts per address per 15
minutes and 3 confirmation-type emails per address per hour. To start over,
clear them with `docker compose exec postgres psql -U devmentor -c "delete
from rate_limit_buckets"`. Per-IP limits are skipped while `TRUST_PROXY` is
`false`.

**Password reset is not available in 1.0** (product decision N03). Both
`/sign-up` and `/sign-in` say so: "Password reset is not available yet. Save
your password in a password manager, or use GitHub sign-in. If you forget an
email-only account's password, you cannot recover access in version 1.0."
GitHub sign-in recovers an account only when its verified primary email is
the account's address. There is no reset route and no manual recovery; don't
add one without a spec.

### Reset the database

```bash
docker compose down -v
docker compose up -d
npm run db:migrate
npm run db:seed   # optional: sample user
```

## Stack

| Concern              | Technology                                                    |
| -------------------- | ------------------------------------------------------------- |
| Framework            | [Next.js 16](https://nextjs.org) (App Router, Turbopack), React 19 |
| Language             | TypeScript (strict, ESM)                                      |
| Database             | PostgreSQL                                                    |
| ORM & migrations     | [MikroORM v7](https://mikro-orm.io) (`@mikro-orm/postgresql`) |
| Dependency injection | [Awilix](https://github.com/jeffijoe/awilix)                  |
| Frontend styling     | [Tailwind CSS v4](https://tailwindcss.com)                    |
| Backend (admin) UI   | [shadcn/ui](https://ui.shadcn.com) on Base UI primitives      |
| Monorepo             | npm workspaces                                                |

## Architecture

### Packages

```
.
├── packages/
│   ├── app/    @devmentor/app   Next.js application
│   │   └── src/
│   │       ├── app/(frontend)/    public pages — Tailwind utilities
│   │       ├── app/(app)/         signed-in pages (/account) — shadcn/ui
│   │       ├── app/(error)/       identity-free /error page
│   │       ├── app/backend/       admin pages (/backend) — shadcn/ui
│   │       ├── app/api/<concept>/ route handlers (apiHandler / makeCrudRoute)
│   │       └── server/            server-only code
│   │           ├── container.ts   DI composition root
│   │           ├── cradle.ts      Cradle types of the app's services
│   │           ├── http.ts        apiHandler, makeCrudRoute, navigationHandler bound to the container
│   │           ├── config.ts      lazily validated env sections (APP_URL/TRUST_PROXY, GITHUB_*, SMTP_URL/MAIL_FROM)
│   │           ├── auth/          page guards, session cookie rules
│   │           ├── cli/           operator CLI (npm run operator)
│   │           └── services/<concept>/  domain services
│   ├── core/   @devmentor/core  reusable, framework-agnostic code
│   │   └── src/
│   │       ├── di/                Awilix container factory + Cradle type
│   │       ├── http/              AppError hierarchy, apiHandler, makeCrudRoute, navigationHandler, clientIp
│   │       ├── security/          tokens, RateLimiter port
│   │       ├── validators/<concept>/  Zod schemas shared by routes and forms
│   │       └── logger.ts          logger with secret redaction
│   ├── db/     @devmentor/db    data layer
│   │   ├── mikro-orm.config.ts    MikroORM CLI entry (loads env)
│   │   └── src/
│   │       ├── config.ts          runtime ORM config (pool, migrations)
│   │       ├── entities/<concept>/  defineEntity-based entities
│   │       ├── migrations/        generated, committed migrations
│   │       ├── single-use-token.ts, rate-limiter.ts  P9 token helpers, Postgres rate limiter
│   │       └── register.ts        registers `orm` + `em` in the container
│   └── ui/     @devmentor/ui    reusable UI
│       └── src/
│           ├── components/        shadcn/ui components; components/<concept>/ domain components
│           ├── api/               apiCall, the client envelope types
│           ├── backend/           CrudForm, DataTable, feedback states
│           ├── forms/             useSchemaForm form core, field-error mapping
│           ├── frontend/          Tailwind-only public kit (SchemaForm, TextField, Notice, …)
│           ├── lib/utils.ts       cn()
│           └── styles/globals.css Tailwind + theme tokens
├── tsconfig.base.json             shared compiler options
└── eslint.config.mjs              one lint config for the whole repo
```

Dependency direction (no cycles):

```
          ┌──────────► @devmentor/ui
          │
@devmentor/app ───────► @devmentor/db ───► @devmentor/core
          │                                   ▲
          └───────────────────────────────────┘
```

- **core** contains no framework code: no React, Next.js or ORM. Anything
  reusable across packages goes here, starting with the DI container.
- **db** owns everything about persistence: configuration, entities,
  migrations, and the container registrations for the ORM. It is
  server-only.
- **ui** is presentation only. It owns the design tokens and the shadcn
  components.
- **app** is the only deployable. It wires the other packages together and
  holds routes, server actions and page-level composition.

The internal packages are **source-only**: their `package.json` `exports`
point at TypeScript files and there is no build step. Next.js (Turbopack)
transpiles workspace packages automatically. Every package runs
`tsc --noEmit` against the shared `tsconfig.base.json`.

### Dependency injection

`@devmentor/core` exposes `createAppContainer()`, an Awilix container in
`PROXY` injection mode with `strict` lifetime checking. Packages contribute
dependencies through a `register*()` function and extend the typed
`Cradle` interface with declaration merging. Resolving from the container
is fully typed, without `core` knowing about other packages.

`packages/app/src/server/container.ts` is the single composition root. It
builds the container once per process, cached on `globalThis` to survive
dev HMR. Each request works in its own child scope:

```ts
import { User } from "@devmentor/db";
import { createRequestScope } from "@/server/container";

const { em } = createRequestScope().cradle; // fresh EntityManager fork
const users = await em.count(User);
```

| Lifetime    | Used for                                                     |
| ----------- | ------------------------------------------------------------ |
| `SINGLETON` | process-wide resources: the `MikroORM` instance and its connection pool |
| `SCOPED`    | per-request state: `em` (an `orm.em.fork()`)                 |
| `TRANSIENT` | stateless services (default)                                 |

### Data layer

- **Entities** are defined with MikroORM's `defineEntity` builder. There are
  no decorators and no `reflect-metadata`, which makes them safe under
  SWC/Turbopack. Each entity extends `baseProperties`: a UUID `id`,
  `createdAt` and `updatedAt`.
- **Connection pooling:** a single `MikroORM` singleton owns the
  `pg` pool. Its size comes from `DB_POOL_MIN` / `DB_POOL_MAX`.
- **Migrations:** the MikroORM Migrator generates them from entity diffs.
  They are committed to `packages/db/src/migrations/` and applied with
  `npm run db:migrate`. The schema never changes outside migrations.
- **Bundling:** MikroORM runs as a native Node dependency. The v7 packages
  are listed in `serverExternalPackages` in `packages/app/next.config.ts`.
- **Env:** the app and the MikroORM CLI load files from `packages/app`,
  with the precedence and mode differences described in
  [Configure env](#4-configure-env).

| Variable       | Default | Purpose                          |
| -------------- | ------- | -------------------------------- |
| `DATABASE_URL` | —       | PostgreSQL connection string     |
| `DB_POOL_MIN`  | `0`     | minimum pooled connections       |
| `DB_POOL_MAX`  | `10`    | maximum pooled connections       |
| `DB_DEBUG`     | `false` | log SQL queries                  |

### UI

- **Frontend pages** in `src/app/(frontend)/` are the public site, styled
  directly with Tailwind utility classes.
- **Backend pages** under `src/app/backend/` are the admin area, built from
  `@devmentor/ui` shadcn components and theme tokens.
- **Tailwind v4** is configured in CSS, so there is no `tailwind.config`.
  `packages/ui/src/styles/globals.css` holds the theme. The app's
  `globals.css` imports it and adds an `@source` for the ui package so its
  classes are generated.
- **New shadcn components** are added with `npm run ui:add -- <name>`,
  following shadcn's monorepo convention. Files go to
  `packages/ui/src/components/`.

## Scripts

All scripts run from the repository root.

| Script                        | Description                                   |
| ----------------------------- | --------------------------------------------- |
| `npm run setup`               | Idempotent local setup (deps, DB, env, migrations) |
| `npm run dev`                 | Start the Next.js dev server                  |
| `npm run build` / `start`     | Production build / serve it                   |
| `npm run lint`                | ESLint across all packages                    |
| `npm run typecheck`           | `tsc --noEmit` in every package               |
| `npm run db:migration:create` | Generate a migration from entity changes      |
| `npm run db:migrate`          | Apply pending migrations                      |
| `npm run db:migrate:down`     | Revert the last migration if it implements `down()` |
| `npm run db:migration:list`   | List executed migrations                      |
| `npm run db:seed`             | Insert the sample user (idempotent)           |
| `npm run ui:add -- <name>`    | Add a shadcn/ui component to `@devmentor/ui`  |
| `npm run operator -- <command>` | Operator CLI: `role grant` / `role revoke` (see [Operator role](#operator-role)) |

## Tests and continuous integration

Unit tests use [Vitest](https://vitest.dev/) and React Testing Library.
Run `npm run test:unit` for a single run, `npm run test:watch` during development,
and `npm run test:coverage` for the CI gate. Every runtime TypeScript file in
workspace `src`, plus the ESLint package-boundary configuration and the
repo scripts in `scripts/**/*.mjs`, must reach
**100% lines, statements, functions, and branches**.
The HTML report is at `coverage/index.html`; LCOV and JSON summaries are also
generated. New features must include tests for their success and failure paths.

Integration tests run the production app using
[Testcontainers PostgreSQL](https://node.testcontainers.org/modules/postgresql/)
and [agent-browser](https://agent-browser.dev/commands). With Docker running:

```bash
npm run test:integration:install # once; Linux: append -- --with-deps if needed
npm run build
npm run test:integration
```

The suite allocates a disposable PostgreSQL instance, applies committed
migrations, chooses an available app port, and cleans up the browser, app,
and container. It never uses your `.env` database. GitHub is replaced by a
local stub (`packages/app/tests/integration/github-stub.ts`), and outbound
email goes to a disposable Mailpit container whose inbox the tests read over
its HTTP API (`packages/app/tests/integration/mailpit.ts`). It covers the
public home, GitHub sign-in, the account page and sign-out, operator
grant/revoke through the real `npm run operator` CLI, admin database
status/navigation, users validation, creation, reload, and duplicate-email
handling, running `npm run db:seed` twice without creating a duplicate,
and email accounts: sign-up with the message read from Mailpit, sign-in
refused before confirming, resend, replaced/expired/tampered links,
confirmation with a full navigation, password sign-in, and the
per-address rate limits. Logs, screenshots, accessibility snapshots, and
JUnit results are saved in `test-results/integration/`.

GitHub Actions runs Build, Lint, Typecheck, Unit tests (100% coverage), and
Integration tests (PostgreSQL + agent-browser) for every pull request and push
to `main`. Integration reuses the build artifact. Coverage and browser evidence
are uploaded for debugging. No database secrets or shared test database are
required. To prevent merging failed checks, make these five check names required
in the repository's GitHub branch protection/ruleset settings.

## Rollback

Rollback is **code only**: deploy the previous code and keep the database as
it is. Schema changes for accounts are additive (new nullable `users`
columns including `password_hash`, the `user_roles`, `auth_sessions`,
`email_confirmation_tokens` and `rate_limit_buckets` tables and their
indexes), so older code keeps working with them. Do not run `npm run db:migrate:down` as
a rollback: its `down()` drops roles, sessions, passwords and confirmation links and is meant only for
disposable databases. Note that code from before the operator gate leaves
`/backend` and `/api/users` open to everyone, as they were then.

## Project process

Specs, run logs and lessons learned live in `.ai/` (see `AGENTS.md`):

- `.ai/specs/`: specifications. The ones for this setup are
  `.ai/specs/implemented/2026-10-13-monorepo-foundation.md` and
  `.ai/specs/implemented/2026-09-01-engineering-standards.md`
  (domain-concept folders and the reusable API/UI layer).
- `.ai/runs/`: autonomous run logs.
- `.ai/lessons.md`: gotchas and root causes worth remembering.
