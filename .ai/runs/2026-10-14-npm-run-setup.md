# Execution plan — idempotent `npm run setup`

Source doc: .ai/specs/implemented/2026-10-14-npm-run-setup.md (design PR #14, issue #13)
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

## Outcome

**Success.** `npm run setup` is implemented as specified, on PR #15.

- **Decisions:**
  - `runSetup(steps, ctx, log)` is synchronous. Every step uses `spawnSync`, so the entry needs no top-level await.
  - Tests live in a single `tests/setup-script.test.ts`. The entry is tested with `vi.doMock`, and `process.exitCode` is reset after each test.
- **Verified facts:**
  - After any install, including a no-op one, npm writes the hidden lockfile about 40 ms after `package-lock.json`.
  - `migration:pending` exits 0 on ECONNREFUSED. This is recorded in `.ai/lessons.md`.
- **Manual runs** (in the worktree, with `COMPOSE_PROJECT_NAME=ai_techleaders` so it reuses the dev container):
  - Run 1 did Dependencies and Env.
  - Run 2 skipped every step and exited 0.
  - After deleting `.env`, only Env ran.
  - With `DATABASE_URL` exported, Docker and Env were skipped.
  - With an unreachable `DATABASE_URL`, it exited 1 with the hint. The password did not appear anywhere in the output.
- **Gate:**
  - lint, typecheck: pass
  - `test:coverage`: pass (100% on 46 files)
  - build: pass
  - `test:integration`: pass (3/3)
- **Review on #15:** the review requested changes because the spec bookkeeping wasn't done (major). Fixed as follows:
  - On #14 the spec now carries a Corrections section and lives in `.ai/specs/implemented/`. Merge #14 before #15.
  - The path references now point at `implemented/`.
  - README steps 1–6 are nested under "Manual setup".
  - Added a failure-path secret test.
  - The entry test's mock cleanup now runs in `finally`.
- **Review on #14 (2026-10-15):** `setup` is now documented in README and AGENTS.md, so it was added to the `BACKWARD_COMPATIBILITY.md` §6 script list.
- **Worktree caveat (not in scope):** Compose derives the project name from the directory. Running setup in a git worktree without `COMPOSE_PROJECT_NAME` would try to start a second Postgres on port 5432, and that fails with the port hint.

## Progress

PR: #15

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: npm run setup

- [x] 1.1 Runner, entry and Prerequisites step — d626ceb
- [x] 1.2 Dependencies and PostgreSQL steps — 9c32fd0
- [x] 1.3 Env and Migrations steps — 43673ad
- [x] 1.4 README and AGENTS.md — b501461
- [x] 1.5 Full gate and bookkeeping
