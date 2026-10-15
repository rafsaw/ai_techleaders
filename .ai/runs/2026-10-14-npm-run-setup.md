# Execution plan — idempotent `npm run setup`

Source doc: .ai/specs/2026-10-14-npm-run-setup.md (design PR #14, issue #13)
Engine: om-auto-create-pr (steps: 5, --loop: no)

This file is both the execution plan and the run log that AGENTS.md requires.

## Goal

Add one root command, `npm run setup`. It takes a fresh clone to "ready for `npm run dev`" by running prerequisites, dependencies, PostgreSQL, env and migrations. Each step checks first whether it is already done and is skipped if so. The command also works without Docker when `DATABASE_URL` is exported.

## Scope

- New: `scripts/setup.mjs` (the entry point), `scripts/setup/run.mjs` and `scripts/setup/steps.mjs`, all using Node built-ins only. Tests go in `tests/setup-script.test.ts`.
- Changed: root `package.json` (the `setup` script), `vitest.config.ts` (`coverage.include` gains `scripts/**/*.mjs`), `tests/tsconfig.json` (`allowJs`), README › Local setup, and AGENTS.md › Testing.

## Non-goals

- Starting `npm run dev`.
- Installing Node or Docker.
- Remapping the port.
- Overwriting `.env`.
- Running migration down or reset.
- CI changes.
- Native Windows shells.
- Parsing `.env*` for `DATABASE_URL` (spec A6).

## Implementation Plan

### Phase 1: `npm run setup`

1. Runner, entry and the Prerequisites step, plus the coverage and typecheck config and their tests.
2. The Dependencies and PostgreSQL steps, with tests.
3. The Env and Migrations steps, the next-command line, with tests, and a manual idempotency run.
4. README Quick setup / Manual setup, and the coverage scope in AGENTS.md.
5. The full gate. Then update this log and move the spec to `implemented/` on spec PR #14.

## Risks

- `migration:pending` exits 0 even when the database is unreachable, so the migrations check parses stdout (spec A3).
- `setup.mjs` sets `process.exitCode` at top level, so tests must reset it.
- The spec file is not on `main`. It merges through #14, so the move to `implemented/` happens on that branch, not here.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: npm run setup

- [ ] 1.1 Runner, entry and Prerequisites step
- [ ] 1.2 Dependencies and PostgreSQL steps
- [ ] 1.3 Env and Migrations steps
- [ ] 1.4 README and AGENTS.md
- [ ] 1.5 Full gate and bookkeeping
