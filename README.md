# DevMentor

A project for tech leaders who use AI in their teams' daily work.

DevMentor is a Next.js + TypeScript monorepo backed by PostgreSQL. Coding
agents should read [`AGENTS.md`](./AGENTS.md) first: it holds the binding
architecture rules this README explains.

## Getting started

Prerequisites: **Node.js ≥ 22.17** (MikroORM v7 requirement), **npm**, and a
running **PostgreSQL** server.

```bash
npm install
cp packages/app/.env.example packages/app/.env.local   # set DATABASE_URL
npm run db:migrate                                      # apply migrations
npm run dev                                             # http://localhost:3000
```

- `/` is the public frontend (Tailwind).
- `/backend` is the admin area (shadcn/ui). It also shows the database
  connection status.

## Local setup

### 1. Prerequisites

- **Node.js ≥ 22.17** and npm.
- **Docker**: Docker Desktop on Windows. If you work in WSL, enable
  Settings -> Resources -> WSL integration for your distro.
- Keep the repo in the WSL filesystem (e.g. `~/projects`), not under `/mnt/c`.

### 2. Install dependencies

Run from the repo root; it installs all workspaces:

```bash
npm install
```

### 3. Start PostgreSQL

```bash
docker compose up -d
docker compose ps
```

Wait until the status is `healthy`. `docker-compose.yml` defines user,
password and database `devmentor` on port 5432. If port 5432 is taken, change
the host port mapping (e.g. `"5433:5432"`) and use the same port in
`DATABASE_URL`.

### 4. Configure env

Create `packages/app/.env` (not in the repo root: the MikroORM CLI in
`packages/db` loads env files from `packages/app` via `@next/env`, and
Next.js reads them from there too) with a single variable:

```bash
DATABASE_URL=postgres://devmentor:devmentor@127.0.0.1:5432/devmentor
```

The file is git-ignored and must never be committed. Only `DATABASE_URL` is
read; `DB_HOST`/`DB_USER`-style variables are not supported. Optional:
`DB_POOL_MIN`, `DB_POOL_MAX`, `DB_DEBUG`.

### 5. Run migrations

```bash
npm run db:migrate
npm run db:migration:list   # optional: verify
```

### 6. Start the app

```bash
npm run dev
```

Open http://localhost:3000. Backend pages are under `/backend`; the users
panel is at `/backend/users`.

### Daily workflow

Make sure Docker is running, then:

```bash
docker compose up -d
npm run dev
```

Stop the database with `docker compose down`. Data is kept in the `pgdata`
volume.

### Reset the database

```bash
docker compose down -v
docker compose up -d
npm run db:migrate
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
│   │       ├── app/backend/       admin pages (/backend) — shadcn/ui
│   │       ├── app/api/<concept>/ route handlers (apiHandler / makeCrudRoute)
│   │       └── server/            server-only code
│   │           ├── container.ts   DI composition root
│   │           ├── cradle.ts      Cradle types of the app's services
│   │           ├── http.ts        apiHandler + makeCrudRoute bound to the container
│   │           └── services/<concept>/  domain services
│   ├── core/   @devmentor/core  reusable, framework-agnostic code
│   │   └── src/
│   │       ├── di/                Awilix container factory + Cradle type
│   │       ├── http/              AppError hierarchy, apiHandler, makeCrudRoute
│   │       ├── validators/<concept>/  Zod schemas shared by routes and forms
│   │       └── logger.ts          logger with secret redaction
│   ├── db/     @devmentor/db    data layer
│   │   ├── mikro-orm.config.ts    MikroORM CLI entry (loads env)
│   │   └── src/
│   │       ├── config.ts          runtime ORM config (pool, migrations)
│   │       ├── entities/<concept>/  defineEntity-based entities
│   │       ├── migrations/        generated, committed migrations
│   │       └── register.ts        registers `orm` + `em` in the container
│   └── ui/     @devmentor/ui    reusable UI
│       └── src/
│           ├── components/        shadcn/ui components
│           ├── backend/           apiCall, CrudForm, DataTable, feedback states
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
- **Env:** the app and the MikroORM CLI read the same `.env*` files in
  `packages/app`, with Next.js precedence.

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
| `npm run dev`                 | Start the Next.js dev server                  |
| `npm run build` / `start`     | Production build / serve it                   |
| `npm run lint`                | ESLint across all packages                    |
| `npm run typecheck`           | `tsc --noEmit` in every package               |
| `npm run db:migration:create` | Generate a migration from entity changes      |
| `npm run db:migrate`          | Apply pending migrations                      |
| `npm run db:migrate:down`     | Revert the last migration                     |
| `npm run db:migration:list`   | List executed migrations                      |
| `npm run ui:add -- <name>`    | Add a shadcn/ui component to `@devmentor/ui`  |

## Project process

Specs, run logs and lessons learned live in `.ai/` (see `AGENTS.md`):

- `.ai/specs/`: specifications. The ones for this setup are
  `.ai/specs/implemented/2026-10-13-monorepo-foundation.md` and
  `.ai/specs/implemented/2026-09-01-engineering-standards.md`
  (domain-concept folders and the reusable API/UI layer).
- `.ai/runs/`: autonomous run logs.
- `.ai/lessons.md`: gotchas and root causes worth remembering.
