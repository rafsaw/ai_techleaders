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
│   │       └── server/container.ts  DI composition root (server-only)
│   ├── core/   @devmentor/core  reusable, framework-agnostic code
│   │   └── src/di/                Awilix container factory + Cradle type
│   ├── db/     @devmentor/db    data layer
│   │   ├── mikro-orm.config.ts    MikroORM CLI entry (loads env)
│   │   └── src/
│   │       ├── config.ts          runtime ORM config (pool, migrations)
│   │       ├── entities/          defineEntity-based entities
│   │       ├── migrations/        generated, committed migrations
│   │       └── register.ts        registers `orm` + `em` in the container
│   └── ui/     @devmentor/ui    reusable UI
│       └── src/
│           ├── components/        shadcn/ui components
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

- `.ai/specs/`: specifications. The one for this setup is
  `.ai/specs/implemented/2026-10-13-monorepo-foundation.md`.
- `.ai/runs/`: autonomous run logs.
- `.ai/lessons.md`: gotchas and root causes worth remembering.
