# Monorepo foundation for DevMentor

**Date:** 2026-10-13
**Status:** implemented (2026-10-13)

## Goal

Turn the single-package `create-next-app` starter into the DevMentor
monorepo with the agreed stack, and record the architecture rules in
`AGENTS.md` and `README.md` so future agents follow them.

## Stack (fixed decisions)

| Concern            | Choice                                                     |
| ------------------ | ---------------------------------------------------------- |
| Framework          | Next.js 16 (App Router) + React 19 + TypeScript (strict)   |
| Database           | PostgreSQL                                                 |
| ORM                | MikroORM v7 (`@mikro-orm/postgresql`), migrations, pooling |
| DI container       | Awilix                                                     |
| Frontend styling   | Tailwind CSS v4                                            |
| Backend (admin) UI | shadcn/ui (on top of Tailwind v4)                          |
| Monorepo tooling   | npm workspaces (`packages/*`)                              |

## Layout

```
packages/
  app/   @devmentor/app   Next.js application (routes, composition root)
  core/  @devmentor/core  framework-agnostic reusable code (DI, errors, utils)
  db/    @devmentor/db    MikroORM config, entities, migrations, ORM helpers
  ui/    @devmentor/ui    shadcn/ui components, Tailwind theme, `cn()`
```

Dependency direction: `app → ui, db, core`; `db → core`; `ui` and `core`
depend on no other workspace package. No cycles.

## Design

- **Source-only internal packages.** Every workspace package is ESM
  (`"type": "module"`), and its `exports` point straight at `.ts`/`.tsx`
  source. There's no per-package build step, because Turbopack transpiles
  workspace packages automatically (see
  `next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/transpilePackages.md`).
- **Shared TS config.** `tsconfig.base.json` sits at the root. Every package
  extends it and has a `typecheck` script.
- **DI (core).** `createAppContainer()` wraps Awilix `createContainer` with
  `InjectionMode.PROXY` and `strict: true`. The `Cradle` interface is empty
  in core. Other packages extend it with TypeScript declaration merging, so
  `container.cradle.x` is typed without core depending on them.
- **Composition root (app).** `packages/app/src/server/container.ts` is the
  only place that registers dependencies. It is `server-only` and is cached
  on `globalThis` so it survives dev HMR.
- **DB.**
  - `mikro-orm.config.ts` is shared by the app and the CLI. It reads
    `DATABASE_URL` and configures the pool with `DB_POOL_MIN`/`DB_POOL_MAX`.
    The `Migrator` extension is enabled.
  - Entities use `defineEntity` with no decorators or reflection, so they
    are safe under SWC/Turbopack.
  - `getOrm()` returns a process-wide ORM singleton. Per-request work uses
    `orm.em.fork()`, never the global EM.
  - The MikroORM CLI runs TypeScript through `tsx`, which the CLI
    auto-detects.
  - The first entity is `User`, so discovery and the initial migration work
    end to end.
- **Next config.** `serverExternalPackages` lists the MikroORM v7 packages
  (`@mikro-orm/postgresql`, `@mikro-orm/sql`, `@mikro-orm/migrations`).
  Next's built-in list still names the v6 `@mikro-orm/knex` instead.
- **UI.**
  - `packages/ui/src/styles/globals.css` owns Tailwind and the shadcn theme
    tokens.
  - The app's `src/app/globals.css` imports it and adds
    `@source "../../../ui/src"`, so only the app knows about ui and not the
    other way round. The root layout imports the app's CSS once.
  - shadcn's base style is `base-nova` (Base UI primitives, neutral). `cn`
    comes from shadcn's `cn` package and is re-exported as
    `@devmentor/ui/lib/utils`.
  - Components live in `packages/ui/src/components`. They are added from
    `packages/app` with `npx shadcn add <component>`, following the shadcn
    monorepo convention.
- **Routes.**
  - `(frontend)` route group: public pages styled with plain Tailwind
    utilities.
  - `(backend)` route group under `/backend`: admin pages built from
    `@devmentor/ui` shadcn components.

## Out of scope

Authentication, real domain modules, testing framework, CI, Docker.

## Acceptance

- `npm install`, `npm run lint`, `npm run typecheck` and `npm run build`
  pass from the repo root.
- `npm run db:migrate` applies the initial migration to `DATABASE_URL`.
- `npm run dev` serves `/` (Tailwind) and `/backend` (shadcn). The
  existing `openmercato.toml` preview command keeps working.
- `AGENTS.md` (architecture rules) and `README.md` (architecture notes) are
  updated.

## Corrections (2026-10-14)

The documentation audit found three inaccurate descriptions in Design.
Current source and the initial foundation commit (`d0b01cd`) confirm the
following; these correct the original description, rather than record later
refactors:

- **DB configuration:** `packages/db/src/config.ts` is the shared runtime
  configuration. `packages/db/mikro-orm.config.ts` is the CLI-only wrapper
  that loads env files from `packages/app` before importing that config.
  The app uses the runtime config directly through the DB registration.
- **ORM access:** the implementation uses `registerDb()`, not `getOrm()`.
  `packages/db/src/register.ts` registers the ORM as a singleton and `em`
  as scoped, with `orm.em.fork()`. The app caches the container on
  `globalThis` and exposes `createRequestScope()` for per-request access.
- **Backend routes:** admin routes live in the plain directory
  `packages/app/src/app/backend/`, which supplies the `/backend` URL
  segment. There is no `(backend)` route group; `(frontend)` remains the
  public-page route group.
