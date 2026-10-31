<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# DevMentor — architecture & stack rules

DevMentor is a Next.js + TypeScript monorepo backed by PostgreSQL. These are
fixed project decisions. Follow them; don't swap in alternatives (other ORMs, DI
libraries, CSS frameworks, component kits, package managers) without an approved
spec in `.ai/specs/`. Background and rationale are in `README.md` and
`.ai/specs/implemented/2026-10-13-monorepo-foundation.md`.

## Task Router

Read what the task needs, plus the `AGENTS.md` of every unit you touch. Paths in
a nested `AGENTS.md` resolve from that file, or else from the repo root.

| Task | Read |
| ---- | ---- |
| Bug fix | `.ai/lessons.md`, `.ai/AGENTS.md` |
| New feature | `.ai/specs/product-brief.md`, `.ai/AGENTS.md`, `packages/app/src/server/AGENTS.md` |
| Refactor | `BACKWARD_COMPATIBILITY.md`, `.ai/specs/implemented/2026-09-01-engineering-standards.md` |
| Review | `CODE_REVIEW.md`, `BACKWARD_COMPATIBILITY.md`, `.ai/skills/om-code-review/SKILL.md` |
| Spec, run log or lesson | `.ai/AGENTS.md` |
| Ticket, label or PR process | `SDLC.md` |
| Domain concept, service, DI, operator CLI | `packages/app/src/server/AGENTS.md` |
| Send email or add a rate limit | `packages/app/src/server/AGENTS.md` |
| Auth, sessions, passwords, invitations | `packages/app/AGENTS.md`, `packages/app/src/server/AGENTS.md`, `packages/app/src/server/services/auth/AGENTS.md` |
| Route or page, guards, Proxy (`packages/app`) | `packages/app/AGENTS.md`, `packages/ui/AGENTS.md`, `packages/ui/docs/design-system.md` |
| API wrapper, errors, validators (`packages/core`) | `packages/core/AGENTS.md` |
| Entity, migration, seeder (`packages/db`) | `packages/db/AGENTS.md` |
| Component, form, styling (`packages/ui`) | `packages/ui/AGENTS.md`, `packages/ui/docs/design-system.md` |
| Integration test | `packages/app/tests/integration/AGENTS.md`, `.ai/browsers/agent-browser.md` |
| Local setup, env vars, operator runbook | `README.md` |
| Breaking change to a protected surface | `BACKWARD_COMPATIBILITY.md` |

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

- **Dependency direction:** `app → ui, db, core`, `db → core`. `core` and `ui`
  depend on no other workspace package. ESLint `no-restricted-imports` enforces
  this, and also that only `db` imports `@mikro-orm/*`.
- **New packages** go in `packages/<name>` as `@devmentor/<name>`. They are
  source-only: `exports` point at `.ts`/`.tsx` files and there is no build step.
  Each one has a `tsconfig.json` extending `../../tsconfig.base.json` and a
  `typecheck` script. Turbopack transpiles workspace packages automatically, so
  don't add them to `transpilePackages`.
- **Imports:** across packages, use the package name
  (`@devmentor/ui/components/button`). Inside `app`, use `@/…` for its own
  `src/`. Never use relative paths that cross a package boundary.
- **Dependencies:** add each one to the package that uses it (`npm install <dep>
  -w @devmentor/<pkg>`). Only repo-wide tooling (eslint, typescript, @types/node)
  goes in the root `package.json`.

## Hard rules

- **Shared layers:** every route and page reuses `packages/core/src/http/` and
  `packages/ui/src/api/` + `packages/ui/src/backend/`. Don't re-implement fetch,
  validation, auth or error handling per feature.
- **Only path to `mentor`:** `RoleService.grantMentorFromInvitation`, called
  inside `accept`'s transaction (user `FOR UPDATE`, then the invitation by hash,
  then the checks, then `consumeSingleUseToken`). Generic `grant` takes only
  `mentee | operator`, and `role grant|revoke --role mentor` is refused. Never
  add another route, field or command that grants `mentor`.
- **Every new feature and every change must have 100% unit test coverage:**
  statements, branches, functions, and lines, enforced **per source file** by
  `npm run test:coverage`. Cover successful behavior, validation, errors, and
  relevant edge cases with meaningful assertions. Never lower thresholds, omit
  source files, add coverage-ignore directives, or mock the code under test to
  make the gate pass. Mock external resources; colocate `*.test.ts(x)` with
  source (Vitest, React Testing Library + jsdom). Coverage includes generated UI
  primitives, migrations, `eslint.config.mjs` and `scripts/**/*.mjs`; repository
  tooling tests live in `tests/`.
- **Add integration cases** for new user flows and persistence behavior.
- **`.ai/` is the source of truth** for specs, run logs and lessons; do not
  improvise other locations. Before implementation, check `.ai/specs/` for a
  covering spec; if none exists and the change is functional and non-trivial,
  write one and get it reviewed before coding. Check `.ai/lessons.md` before
  non-trivial work.
- **Done means:** the local checks that fit the change's scope pass (`npm run
  lint`, `typecheck`, `build`, `test:coverage`, `test:integration`). If the
  schema changed, the migration must also apply cleanly. Full green CI
  (`.github/workflows/ci.yml`) is required before merge. A task is not complete
  until its spec is updated and, for an autonomous run, its log exists in
  `.ai/runs/`. Check this before reporting completion.

## Commands (run from the repo root)

| Task | Command |
| ---- | ------- |
| Dev server | `npm run dev` |
| New migration | `npm run db:migration:create` (first one: `-- --initial`) |
| Apply / revert / list migrations | `npm run db:migrate` / `db:migrate:down` / `db:migration:list` |
| Seed sample data (idempotent) | `npm run db:seed` |
| Add shadcn component | `npm run ui:add -- <name>` |
| Grant / revoke operator | `npm run operator -- role grant\|revoke --email <email> --role operator [--yes]` |
| UI checks, also run in CI | `npm run test:storybook`, `npm run check:tokens` |
| Router and budgets | `npm run check:agents` |

## Working rules

1. **Plan before you build. If it goes wrong, plan again.** Start non-trivial
   work with a plan. Plan mode does not replace a reviewed spec for non-trivial
   functional changes. If the implementation goes off track, stop and update the
   plan instead of piling patches on top.
2. **Turn every correction into a rule:** a lesson in `.ai/lessons.md`, or this
   file if it's a standing convention.
3. **Fix things yourself and prove they work.** Given a bug report, failing test
   or CI failure, find the root cause and fix it without waiting for step-by-step
   instructions. Ask for review only after the checks pass.
4. **Prefer the elegant fix.** If a fix feels hacky, throw it out and rewrite it.
5. **Use subagents only when justified by substantial independent work, and turn
   repeated work into reusable tools.** Anything you do more than once a day
   should become a skill or slash command and be committed to git.

## Gotchas

- The root `node_modules/zod` is **v3**, pulled in by shadcn and
  eslint-plugin-react-hooks. Workspaces use zod **v4** (`z.email()`, `z.uuid()`),
  installed under `packages/core/node_modules`. Run zod scripts from inside a
  workspace package, not the repo root.
