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
  never import from `@devmentor/app` in another package. ESLint
  `no-restricted-imports` enforces this, and also enforces that only `db`
  imports `@mikro-orm/*`.
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

## Domain concept convention

Domain code is not organized into `modules/`. Each concept (`auth`, `mentors`,
`availability`, `bookings`, `payments`, `messages`, `favorites`, `reviews`, …)
is a same-named sub-folder repeated across the layers that need it:

- `packages/db/src/entities/<concept>/<name>.entity.ts`
- `packages/app/src/server/services/<concept>/<name>.service.ts`. Services
  need entities and `em`, so they can't live in `core` (`db → core`). They
  live in app's server-only zone and are registered in `container.ts`.
- `packages/core/src/validators/<concept>/<name>-<action>.schema.ts`: the
  shared Zod schemas, imported as
  `@devmentor/core/validators/<concept>/<file>`.
- `packages/app/src/app/api/<concept>/route.ts` and the matching `page.tsx`.

Create a concept folder only when its first file is added. Never scaffold
empty ones. This is a directory convention, not a module runtime: there is
no per-concept setup, ACL or auto-discovery. Full naming table and rules:
`.ai/specs/implemented/2026-09-01-engineering-standards.md`.

- **Adding a service:**
  - Add one explicit line to `container.ts`
    (`asClass(X)`, transient by default).
  - Add its type to `packages/app/src/server/cradle.ts`.
  - Never glob-load services with `loadModules`.
- **Service return values:** services return plain DTOs, never entities.
  Client components import the DTO *type* with `import type`.
- **External integrations** (payments, later notifications and video) go
  through a port interface (`*.port.ts`) with a mock adapter under
  `adapters/`. Callers depend on the port, never on a vendor SDK.
- **Domain events:**
  - Event IDs follow `concept.entity.action` (e.g.
    `bookings.booking.created`).
  - They're emitted through a typed in-process emitter in
    `packages/core/src/events`, registered on the `Cradle`. There is no
    queue or worker.
  - Add the emitter with the first feature that emits an event, not before.

## Reusable API & UI layer

Every route and page reuses two shared layers. Don't re-implement fetch,
validation, auth or error handling per feature.

- **Server: `packages/core/src/http/`, exported from `@devmentor/core`.**
  - `errors.ts` is the typed `AppError` hierarchy: `ValidationError` 400,
    `UnauthorizedError` 401, `ForbiddenError` 403, `NotFoundError` 404,
    `ConflictError` 409. Services throw these and never build responses.
  - `apiHandler.ts` provides the wrapper every route goes through. It:
    - checks the CSRF header on non-GET requests,
    - creates a container scope and passes its `cradle`,
    - returns `{ ok: true, data }` or
      `{ ok: false, error: { code, message, fieldErrors? } }`,
    - maps `AppError`s to their status, and logs anything else as a 500
      without leaking details.
  - `makeCrudRoute.ts` builds handlers for plain CRUD resources. You pass
    `methods`, `service` and the schemas; it returns the handlers. `PUT` and
    `DELETE` take `?id=<uuid>`. Workflow endpoints (booking, reschedule,
    payment) use `apiHandler` directly.
  - `validation.ts`: `parseInput(schema, input)` throws a `ValidationError`
    with per-field messages.
  - `auth.ts` (`requireSession`, `requireRole`, ownership assertions) is
    added together with the auth concept.
- **App wiring: `packages/app/src/server/http.ts`.** It binds `apiHandler`
  and `makeCrudRoute` to the container. Route files import them from
  `@/server/http` and never write their own `try/catch` or
  `NextResponse.json`.
- **Client: `packages/ui/src/backend/`.**
  - `api/apiCall.ts`: `apiCall` and `apiCallOrThrow` are the only sanctioned
    way to `fetch()` `/api/*`. They always send the CSRF header and parse the
    envelope defensively.
  - `forms/CrudForm.tsx`: a schema-driven form bound to the same Zod schema
    as the route.
  - `tables/DataTable.tsx`: column-config lists with loading, error and
    empty states, pagination, and row actions.
  - `feedback/{LoadingMessage,ErrorMessage,EmptyState}.tsx`: the only
    loading, error and empty renderers.
- **Envelope types:** `core` and `ui` each declare the envelope and
  `CSRF_HEADER`, because ui may not import core. Keep the two in sync. Zod
  is a peer dependency of `ui`, since ui only uses its types.
- **Reference example:** `api/users/route.ts` together with
  `backend/users/` is the example to copy for a new concept.

Every new reusable component has one designated home:

1. **shadcn primitive:** `ui/src/components/`, added via `npm run ui:add`
   and never hand-written.
2. **Generic, concept-agnostic panel pattern:**
   `ui/src/backend/<category>/`.
3. **Component tied to one concept's domain shape:**
   `ui/src/components/<concept>/`, named after the concept folder used in
   `db` and `app`.
4. **Used by exactly one page:** colocate it next to that `page.tsx` until a
   second consumer appears.

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
- **Seeders:** live in `packages/db/src/seeders/` and must be listed in
  `seeder.seedersList` in `src/config.ts`. Without the list, `seeder:run`
  imports every file in that folder, colocated tests included.
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
| Seed sample data (idempotent) | `npm run db:seed` |
| Add shadcn component | `npm run ui:add -- <name>` |

Before calling work done, `npm run lint`, `npm run typecheck`,
`npm run build`, `npm run test:coverage`, and `npm run test:integration`
must all pass. If the schema changed, the migration must also apply cleanly.
A task is not complete until its run log exists in .ai/runs/ and its spec is updated. Check this before reporting completion.

## Testing and pull request CI

- **Every new feature and every change must have 100% unit test coverage:**
  statements, branches, functions, and lines, enforced **per source file** by
  `npm run test:coverage`. Cover successful behavior, validation, errors, and
  relevant edge cases with meaningful assertions. Never lower thresholds,
  omit source files, add coverage-ignore directives, or mock the code under
  test to make the gate pass.
- Use **Vitest** for TypeScript units and **React Testing Library** with
  **jsdom** for components. Colocate `*.test.ts` / `*.test.tsx` with source.
  Keep package import boundaries in tests. Coverage includes all workspace
  `src` runtime TypeScript, including generated UI primitives and migrations,
  plus the executable `eslint.config.mjs` package-boundary configuration and
  the Node-only repo scripts in `scripts/**/*.mjs` (e.g. `npm run setup`);
  tests and declaration files are excluded. Type-only files have no runtime.
  Migration tests live one directory above `src/migrations/` so the MikroORM
  CLI cannot discover them as migrations. Repository tooling tests live in
  `tests/`; `tests/eslint-config.test.ts` exercises forbidden and allowed imports.
- Mock external resources for unit tests. Async Server Component orchestration
  may be invoked directly with mocked request dependencies; verify actual
  server rendering through integration tests too.
- Use **Testcontainers PostgreSQL + agent-browser** for integration tests in
  `packages/app/tests/integration/`. Apply committed migrations to a fresh
  container, run the production build, use isolated browser sessions, and
  clean up resources on success and failure. Never use a developer/shared
  database, depend on demo data, or silently skip when Docker is unavailable.
- Before integration tests: `npm run build` and
  `npm run test:integration:install` (Linux may need `-- --with-deps`).
  Docker must be running. Run `npm run test:integration`; evidence is written
  to `test-results/integration/`, coverage to `coverage/`.
- Add integration cases for new user flows and persistence behavior. The
  existing home, dashboard, and users scenarios are the baseline.
- `.github/workflows/ci.yml` checks each PR with Build, Lint, Typecheck,
  Unit tests (100% coverage), and Integration tests (PostgreSQL + agent-browser).
  A feature is complete only when all checks pass.

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
- The root `node_modules/zod` is **v3**, pulled in by shadcn and
  eslint-plugin-react-hooks. Workspaces use zod **v4**
  (`z.email()`, `z.uuid()`), installed under `packages/core/node_modules`.
  Run zod scripts from inside a workspace package, not the repo root.
- `CrudForm` seeds every field with `""`. Keep it that way: an `undefined`
  value makes Zod report "expected string" instead of the schema's own
  message (e.g. "Name is required").

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
