# Run: idempotent database seeder (`npm run db:seed`)

Source doc: .ai/specs/2026-10-15-database-seeder.md (spec PR #18)
Issue: #17

## Goal

Add a `DatabaseSeeder` in `@devmentor/db` and an `npm run db:seed` script. The seeder inserts one sample user (Ada Lovelace, `ada@devmentor.dev`) and leaves an existing row unchanged on a re-run.

## Scope

- **`packages/db`:**
  - `@mikro-orm/seeder` dependency
  - `src/seeders/database.seeder.ts`
  - `SeedManager` and `seedersList` in `src/config.ts`
  - `seed` script
- **Root `package.json`:** `db:seed`.
- **`packages/app/next.config.ts`:** `@mikro-orm/seeder` in `serverExternalPackages`.
- **Integration:** a last-position seed case in `packages/app/tests/integration/`.
- **Docs:** README › Local setup and the `AGENTS.md` Commands table.

**Non-goals:**
- no mentor entities;
- no schema change or migration;
- no change to `scripts/setup.mjs` / `npm run setup` (open PR #15; wiring them up is a follow-up);
- the spec file itself is not committed here (it merges via #18).

## Implementation Plan

### Phase 1: Seeder in `@devmentor/db`

1. Add the `@mikro-orm/seeder` dependency and the `serverExternalPackages` entry.
2. Add `DatabaseSeeder` (find-or-create by email), with a colocated unit test.
3. Register `SeedManager` and `seedersList` in `config.ts`, and update `config.test.ts`.

### Phase 2: Command, integration proof, docs

1. Add the `seed` / `db:seed` scripts, and an integration case that runs the seed twice and checks the user appears once.
2. Document the command in README › Local setup and in the `AGENTS.md` Commands table.

### Phase 3: Gate

1. Run the full gate (lint, typecheck, test:coverage, build, test:integration) and close out the run log.

## Risks

- The app imports `config.ts`, so a missing `serverExternalPackages` entry would break the build. The gate's `npm run build` catches this.
- The integration seed case shares the container with earlier cases, so it must stay last.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Seeder in @devmentor/db

- [ ] 1.1 Add @mikro-orm/seeder dependency and serverExternalPackages entry
- [ ] 1.2 Add DatabaseSeeder with unit test
- [ ] 1.3 Register SeedManager and seedersList in config

### Phase 2: Command, integration proof, docs

- [ ] 2.1 Add db:seed scripts and integration case
- [ ] 2.2 Document db:seed in README and AGENTS.md

### Phase 3: Gate

- [ ] 3.1 Full validation gate and run log outcome
