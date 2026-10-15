# Code review rules

The review rules for DevMentor. `om-code-review` (and therefore `om-auto-review-pr`) applies this file automatically, on top of its built-in checklist. Human reviewers use it the same way. The authoritative stack and architecture rules are in `AGENTS.md`; this file turns them into review checks. When the two disagree, `AGENTS.md` wins and this file should be fixed.

## Review priorities

Review in this order, and don't let a later category hide an earlier one:

1. **Correctness.** Does the change do what its spec or issue says, including the unhappy paths? Check it against the spec in `.ai/specs/` when one exists. Specs drift, so flag a mismatch either way (see `.ai/lessons.md`, "Keep specs aligned with implementation").
2. **Security.** Every route goes through `apiHandler`, so the CSRF check, the per-request scope and the error mapping apply. Nothing leaks internals in a 500, there are no secrets or `.env` values in code, logs or fixtures, and server-only code stays out of client bundles.
3. **Contracts.** Changes to anything listed in `BACKWARD_COMPATIBILITY.md` follow the path that file requires.
4. **Architecture and conventions.** These are the repo-specific checks below.
5. **Tests and evidence.** The change keeps 100% per-file coverage, and integration coverage exists for new user flows.
6. **Quality.** Naming, duplication, comment density that matches the surrounding code.

## Repo-specific checks

### Package boundaries

- Dependency direction is `app → ui, db, core` and `db → core`. `core` and `ui` import no other workspace package, and nothing imports `@devmentor/app`. Only `db` imports `@mikro-orm/*`. ESLint `no-restricted-imports` enforces this; a change that loosens `eslint.config.mjs` to let a violation through is a **blocker**.
- `core` stays framework-agnostic: no React, Next.js or MikroORM.
- `ui` is presentation only: no data access, no server-only code.
- `@devmentor/db` is imported only from Server Components, Route Handlers, Server Actions and `packages/app/src/server/**`, never from a `"use client"` module.
- Imports across packages use the package name (`@devmentor/ui/components/button`). Inside `app` they use `@/…`. A relative path that crosses a package boundary is a finding.
- Each dependency is added to the workspace that uses it. Only repo-wide tooling goes in the root `package.json`. Lockfile changes come from `npm`; a `pnpm-lock.yaml`, `yarn.lock` or `bun.lockb` is a **blocker**.

### Domain concepts and layout

- Concept code follows the folder convention: `db/src/entities/<concept>/`, `app/src/server/services/<concept>/`, `core/src/validators/<concept>/`, `app/src/app/api/<concept>/`. File names follow `.ai/specs/implemented/2026-09-01-engineering-standards.md`.
- No `modules/` folder and no empty, pre-scaffolded concept folders.
- Reusable components go to their one designated home (`AGENTS.md`, "Every new reusable component has one designated home"). A shadcn primitive written by hand, or copied into `app`, is a finding.

### API layer

- Route files import `apiHandler` / `makeCrudRoute` from `@/server/http`. A route that writes its own `try/catch`, calls `NextResponse.json`, or builds an envelope by hand is a **blocker**.
- Input is validated with `parseInput(schema, input)` against a shared Zod schema from `@devmentor/core/validators/…`, and the client form uses the same schema.
- Services throw the typed `AppError` subclasses (`ValidationError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`). They never build responses or return status codes.
- Services return plain DTOs, never entities. Client components import DTO types with `import type`.
- Client code reaches `/api/*` only through `apiCall` / `apiCallOrThrow`. A raw `fetch('/api/…')` is a finding.
- Loading, error and empty states render through `LoadingMessage`, `ErrorMessage` and `EmptyState`.
- If the envelope types or `CSRF_HEADER` change in `core`, the twin declaration in `packages/ui/src/backend/api/types.ts` must change in the same PR (and the reverse).
- Until the auth concept lands, routes are unauthenticated (`TODO(auth)` in `api/users/route.ts`). A new route that exposes user data or a write path is flagged so it isn't forgotten when `requireSession` arrives.

### Dependency injection

- Each new service is added with one explicit `asClass(X)` line in `packages/app/src/server/container.ts`, and its type goes in `cradle.ts`. No `loadModules` globbing, no raw Awilix containers, no `any` cradle.
- Services take a destructured cradle (`({ em, logger }) => …`) and never import singletons.
- Lifetimes: the ORM, clients and config are `SINGLETON`, `em` is `SCOPED`, everything else is `TRANSIENT`. Turning `strict` off to silence a lifetime error is a **blocker**; the fix is to correct the lifetime.
- Request, server action and job code resolves from `createRequestScope()`.

### Database

- Entities use `defineEntity` + `p` with the `class X extends XSchema.class {}` / `XSchema.setClass(X)` pattern, spread `baseProperties`, live in `*.entity.ts`, and are listed in `entities/index.ts`. Decorators or `reflect-metadata` are a **blocker**.
- Request work uses the scoped `em`, never `orm.em`. `persistAndFlush` doesn't exist in v7; use `em.persist(x).flush()`.
- An entity change ships with a generated, reviewed migration in `packages/db/src/migrations/`. Editing a migration that has already been applied is a **blocker**; write a new one instead. `schema:update` / `schema:fresh` must not appear in scripts or docs aimed at shared databases.
- Migration tests live one directory above `src/migrations/` so the MikroORM CLI doesn't pick them up.
- A new MikroORM package must also be added to `serverExternalPackages` in `packages/app/next.config.ts`.
- Pages that query the DB render at request time (`await connection()` or a request API), so `next build` never touches the database.
- No hard-coded credentials. Settings come from `DATABASE_URL`, `DB_POOL_MIN`, `DB_POOL_MAX` and `DB_DEBUG`.

### UI

- Frontend pages under `app/(frontend)/` use plain Tailwind utilities and no shadcn components, unless a spec says otherwise.
- Backend pages under `app/backend/` compose `@devmentor/ui` shadcn components and theme tokens (`bg-card`, `text-muted-foreground`). A hand-rolled widget that a shadcn component already covers is a finding.
- Components use Base UI, not Radix. A link rendered as a button uses `<Button nativeButton={false} render={<Link …/>}>`; `asChild` is a finding.
- Classes are merged with `cn()`. Theme tokens are added only in `packages/ui/src/styles/globals.css`, and there is no `tailwind.config.*`.
- `CrudForm` seeds every field with `""`. A change that seeds `undefined` breaks the schema's own error messages.

### Tests

- 100% statements, branches, functions and lines per source file (`npm run test:coverage`). Lowering thresholds, excluding source files, `/* v8 ignore */`-style directives, or mocking the code under test to pass the gate are **blockers**.
- Tests are colocated as `*.test.ts(x)`: Vitest for units, React Testing Library + jsdom for components. External resources are mocked in unit tests, and tests respect package import boundaries too.
- A new user flow or persistence behavior adds a case in `packages/app/tests/integration/`. These cases use Testcontainers PostgreSQL and agent-browser against the production build, never a shared database or demo data, and never skip silently when Docker is missing.

### Process artifacts

- Non-trivial work references its spec in `.ai/specs/`. A fully implemented spec moves to `.ai/specs/implemented/` without being renamed.
- An autonomous run adds a log in `.ai/runs/YYYY-MM-DD-slug.md` and never overwrites an earlier one.
- A fix for a non-trivial bug adds an entry to `.ai/lessons.md`. Lessons are never deleted; outdated ones are marked superseded.

## Validation gate

The reviewer checks that the configured gate passed on the PR head:

- `npm run lint`
- `npm run typecheck`
- `npm run test:coverage`
- `npm run build`

CI also runs `npm run test:integration`, and that job and the unit-coverage job are required checks on `main`. A schema change must also apply cleanly with `npm run db:migrate`.

## Severity guidance

- **Blocker:** must be fixed before merge. This covers incorrect behavior, a security hole, a broken contract without its migration path, a package-boundary or architecture violation listed above, a weakened coverage gate, an edited applied migration, or a failing required check.
- **Major:** should be fixed in this PR. This covers missing tests for a real path, a convention violation with real cost (raw `fetch`, entity returned from a service, a hand-rolled widget), a missing migration review, or spec drift.
- **Minor:** fix now or in a tracked follow-up (`om-followup-issue-from-pr`). This covers naming, local duplication, a comment that is missing or wrong.
- **Nit:** optional, and never the reason for `changes-requested`.

Every finding cites the file and line plus the rule behind it (this file, `AGENTS.md`, or a spec). A blocker or major finding moves the PR to `changes-requested`. A failing required check or a merge conflict is reported as a blocker together with the full review, not instead of it. Risk-based extra evidence (`risk-high` areas) is defined in `SDLC.md`.
