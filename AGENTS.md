<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# DevMentor — architecture & stack rules

These are fixed project decisions. Follow them; don't swap in alternatives
(other ORMs, DI libraries, CSS frameworks, component kits, package managers)
without an approved spec in `.ai/specs/`. Background and rationale are in
`README.md` and `.ai/specs/implemented/2026-10-13-monorepo-foundation.md`.

## Stack

| Concern             | Use                                                         |
| ------------------- | ----------------------------------------------------------- |
| Framework           | Next.js 16 (App Router, Turbopack) + React 19               |
| Language            | TypeScript, `strict`, ESM everywhere (`"type": "module"`)   |
| Database            | PostgreSQL                                                  |
| ORM / migrations    | MikroORM v7 (`@mikro-orm/postgresql`, `@mikro-orm/migrations`) |
| Dependency injection| Awilix                                                      |
| Frontend pages      | Tailwind CSS v4 utilities                                   |
| Backend (admin) pages | shadcn/ui components (Base UI primitives, Tailwind v4)    |
| Monorepo            | npm workspaces — always use `npm`, never pnpm/yarn/bun      |

## Monorepo layout

```
packages/
  app/   @devmentor/app   Next.js app: routes, server actions, composition root
  core/  @devmentor/core  framework-agnostic reusable code: DI container, errors, utils
  db/    @devmentor/db    MikroORM config, entities, migrations, DB registrations
  ui/    @devmentor/ui    shadcn/ui components, Tailwind theme (globals.css), `cn()`
```

- **Dependency direction:** `app → ui, db, core`, `db → core`. `core` and
  `ui` depend on no other workspace package. Never introduce cycles, and
  never import from `@devmentor/app` in another package.
- **`core` stays framework-agnostic:** no React, no Next.js, no MikroORM.
- **`ui` is presentation only:** no data access, no server-only code.
- **`db` is server-only.** Import it only from Server Components, Route
  Handlers, Server Actions and `packages/app/src/server/**`, never from a
  `"use client"` module.
- **New packages** go in `packages/<name>` as `@devmentor/<name>`. They are
  source-only: `exports` point at `.ts`/`.tsx` files and there is no build
  step. Each one has a `tsconfig.json` extending `../../tsconfig.base.json`
  and a `typecheck` script. Turbopack transpiles workspace packages
  automatically, so don't add them to `transpilePackages`.
- **Imports:** across packages, use the package name
  (`@devmentor/ui/components/button`). Inside `app`, use `@/…` for its own
  `src/`. Never use relative paths that cross a package boundary.
- **Dependencies:** add each one to the package that uses it
  (`npm install <dep> -w @devmentor/<pkg>`). Only repo-wide tooling (eslint,
  typescript, @types/node) goes in the root `package.json`.

## Dependency injection (Awilix)

- `createAppContainer()` from `@devmentor/core` builds the container with
  `InjectionMode.PROXY` and `strict: true`. Don't create raw Awilix
  containers.
- `packages/app/src/server/container.ts` is the **only composition root**.
  It calls each package's `register*()` function. It is `server-only` and
  cached on `globalThis`, so there is one container, one ORM and one pool
  per process.
- **Expose a `register*` function.** A package that provides services
  exports `registerX(container)`, the way `registerDb` does. It adds its
  keys to the `Cradle` interface with declaration merging
  (`declare module "@devmentor/core" { interface Cradle { … } }`). Every
  registration must be typed; `cradle` must never be `any`.
- **Constructor style:** services take a destructured cradle in their
  constructor or factory (`({ em, logger }) => …`) and never import
  singletons directly.
- **Lifetimes:**
  - `SINGLETON`: process-wide resources such as the ORM, clients and config.
  - `SCOPED`: per-request state such as `em`.
  - `TRANSIENT`: everything else.
  - `strict` mode rejects a singleton that depends on a scoped
    registration. Fix the lifetime rather than turning `strict` off.
- **Per-request work:** each request, server action or job calls
  `createRequestScope()` and resolves from that scope's `cradle`.

## Database (MikroORM v7 + PostgreSQL)

- **Configuration:**
  - `packages/db/src/config.ts` is the runtime config, shared by the app and
    the CLI.
  - `packages/db/mikro-orm.config.ts` is the CLI entry. It loads `.env*`
    from `packages/app`, the same files Next.js reads.
  - Settings come from env vars: `DATABASE_URL`, `DB_POOL_MIN`,
    `DB_POOL_MAX` and `DB_DEBUG`. Never hard-code credentials.
- **Entities:**
  - Define entities with `defineEntity` + `p` and a class
    (`class X extends XSchema.class {}` then `XSchema.setClass(X)`).
  - Don't use decorators or `reflect-metadata`. SWC/Turbopack don't emit
    decorator metadata.
  - Spread `baseProperties` (uuid `id`, `createdAt`, `updatedAt`) into every
    entity.
  - Name files `*.entity.ts` under `packages/db/src/entities/`.
  - List every entity in the `entities` array in `entities/index.ts`.
    There's no folder discovery.
- **Entity manager:**
  - Use the scoped `em` from a container scope (a fork).
  - Never use `orm.em` (the global EM) for request work.
  - v7 has no `persistAndFlush`. Use `em.persist(x).flush()`.
- **Schema changes go through migrations only:**
  - Change the entity, run `npm run db:migration:create`, review the
    generated file in `packages/db/src/migrations/`, commit it, and apply
    it with `npm run db:migrate`.
  - Never use `schema:update` or `schema:fresh` against shared databases.
  - Never edit a migration that has already been applied. Write a new one.
- **Pages that query the DB** must render at request time. Call
  `await connection()` (from `next/server`) or use a request API, so the
  build never queries the database.
- **New MikroORM packages** must be added to `serverExternalPackages` in
  `packages/app/next.config.ts`. Next's built-in list only knows the v6
  package names.

## UI: frontend vs backend pages

- **Frontend (public) pages** live in `packages/app/src/app/(frontend)/`.
  Style them with plain Tailwind utility classes. Don't use shadcn
  components here unless a spec says so.
- **Backend (admin) pages** live under `packages/app/src/app/backend/`
  (URL `/backend`). Compose them from `@devmentor/ui` shadcn components plus
  the theme tokens (`bg-card`, `text-muted-foreground`, …). Don't hand-roll
  a widget when a shadcn component exists for it.
- **Adding shadcn components:** run `npm run ui:add -- <component>` from
  the repo root. Files land in `packages/ui/src/components/` and
  dependencies go into `@devmentor/ui`. Don't copy component code into
  `app`.
- **Editing shadcn components:**
  - Treat generated components as owned code: edit them in
    `packages/ui/src/components/` and keep their public API stable.
  - Components are built on **Base UI**, not Radix. To render a link as a
    button, use
    `<Button nativeButton={false} render={<Link href="…" />}>`, not
    `asChild`.
- **Styling setup:**
  - Global styles and theme tokens live only in
    `packages/ui/src/styles/globals.css`. The app's
    `src/app/globals.css` imports it and adds `@source` for the ui sources.
  - Use `cn()` from `@devmentor/ui/lib/utils` to merge classes.
  - There is no `tailwind.config.*`, because Tailwind v4 is configured in
    CSS.

## Commands (run from the repo root)

| Task | Command |
| ---- | ------- |
| Dev server | `npm run dev` |
| Production build | `npm run build` |
| Lint (all packages) | `npm run lint` |
| Typecheck (all packages) | `npm run typecheck` |
| New migration | `npm run db:migration:create` (first one: `-- --initial`) |
| Apply / revert / list migrations | `npm run db:migrate` / `db:migrate:down` / `db:migration:list` |
| Add shadcn component | `npm run ui:add -- <name>` |

Before calling work done, `npm run lint`, `npm run typecheck` and
`npm run build` must all pass. If the schema changed, the migration must
also apply cleanly.

## Gotchas

- `next build` must run with `NODE_ENV=production`. The app's build script
  pins it, because some shells export `NODE_ENV=development`, and that
  breaks the prerender with `useContext` of null.
- Restart `next dev` after changing entity definitions. The ORM is cached
  per process and won't see HMR'd entity metadata.
- MikroORM v7 is ESM-only and needs Node ≥ 22.17. The CLI runs TypeScript
  through `tsx`, which it auto-detects. Don't add `ts-node`.
- `packages/app/AGENTS.md` exists so `next dev` finds its managed block
  there. Keep project rules in this root file.

# Spec-Driven Development (SDD) & agent metadata

This project uses a `.ai/` folder as the source of truth for specs, run logs,
and lessons learned. Every agent (human-directed or autonomous) working in
this repo MUST follow this structure — do not improvise alternative
locations for specs, logs, or notes.

## `.ai/specs/` — specifications

- Every feature/change that goes through SDD gets a spec file named
  `YYYY-MM-DD-slug.md` (date the spec was created, kebab-case slug).
- New specs are written directly in `.ai/specs/`.
- Once a spec has been fully implemented, move the file into
  `.ai/specs/implemented/` (keep the original filename — don't rename or
  change the date).
- If a spec is abandoned, superseded, or no longer relevant, move it into
  `.ai/specs/archive/` instead of deleting it.
- Before starting implementation work, check `.ai/specs/` for an existing
  spec covering the task. If none exists and the task is non-trivial, write
  one first and get it reviewed before coding.

## `.ai/runs/` — autonomous run logs

- Every autonomous AI run (unattended / agentic execution, not a normal
  interactive session) writes a log file to `.ai/runs/` named
  `YYYY-MM-DD-slug.md` (date the run started, kebab-case slug describing the
  task).
- The log should capture: what the run was asked to do, what it did, key
  decisions, and the outcome (success/failure/partial).
- Do not overwrite or delete past run logs. If a run is retried, use a new
  slug (or append `-2`, `-3`, ...) rather than clobbering the original file.

## `.ai/lessons.md` + `.ai/lessons/` — long-term memory

- `.ai/lessons.md` is the append-only index of lessons learned: gotchas,
  bug-fix root causes, and improvements worth remembering across sessions.
- After fixing a non-trivial bug, or whenever you discover something future
  agents should know, add an entry to `.ai/lessons.md` using the template at
  the top of that file.
- If a lesson is substantial enough to warrant a full write-up, create
  `.ai/lessons/YYYY-MM-DD-slug.md` and link it from `.ai/lessons.md` instead
  of inlining the whole thing.
- Never delete lessons. If a lesson becomes outdated, mark it as superseded
  inline rather than removing it.
- Check `.ai/lessons.md` before starting non-trivial work, especially in
  areas with a history of bugs — a relevant lesson may already exist.

## Naming rules (applies to all of the above)

- Format: `YYYY-MM-DD-slug.md`, date first, then a short kebab-case slug.
- Use the date the file was created/the run started — never update it later.
- Slugs should be short and descriptive (e.g. `2026-10-13-auth-session-fix.md`).

# Working rules (distilled from Boris Cherny's Claude Code tips)

Source: https://ykdojo.github.io/claude-code-tips/content/boris-claude-code-tips

1. **Plan before you build. If it goes wrong, plan again.** Start non-trivial
   work in plan mode or with a spec in `.ai/specs/`. Make the plan detailed
   enough that the implementation can be done in one pass. If the
   implementation goes off track, stop and update the plan instead of piling
   patches on top.
2. **Turn every correction into a rule.** When a human corrects you, write a
   lesson to `.ai/lessons.md` (or update this file if it's a standing
   convention) so the same mistake doesn't come back. Keep rules short and
   specific, and refine them until the mistake actually stops happening.
3. **Fix things yourself and prove they work.** When you're given a bug
   report, a failing test, or a CI failure, find the root cause and fix it
   without waiting for step-by-step instructions. Before you say it's done,
   run the relevant tests, lint, and build. Ask for review only after the
   checks pass.
4. **Prefer the elegant fix over the first one that works.** If a fix feels
   hacky, throw it out and rewrite it cleanly using what you've learned.
   Specific specs and prompts produce better output than vague ones.
5. **Use subagents, and turn repeated work into reusable tools.** Hand off
   research, exploration, and parallel subtasks to subagents so the main
   context stays focused. Anything you do more than once a day should become
   a skill or slash command and be committed to git.
