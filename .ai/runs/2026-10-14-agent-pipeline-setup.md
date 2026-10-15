# 2026-10-14 — Agent pipeline setup

## Ask

Run `/om-setup-agent-pipeline` to configure the open-mercato agent skills
(installed in #10) for this repository.

## What was done

- Detected the repo shape:
  - Tracker: GitHub, `rafsaw/ai_techleaders`, default branch `main`.
  - Runner: npm (`package-lock.json`).
  - Validation scripts mirror `.github/workflows/ci.yml`.
  - `agent-browser` is already a devDependency.
  - `AGENTS.md`/`CLAUDE.md` already exist and were left untouched.
- Wrote `.ai/agentic.config.json`:
  - tracker `github`, browser `agent-browser`, `baseBranch: auto`.
  - Full label taxonomy, QA gate on, specs in `.ai/specs`.
- Installed `.ai/trackers/github.md` and `.ai/browsers/agent-browser.md`
  from the skill's shipped descriptors.
- Created the 25 missing taxonomy labels on GitHub. `bug` and
  `documentation` already existed and were not modified.
- Generated `SDLC.md` (from the skill template, without the discovery layer),
  plus `CODE_REVIEW.md` and `BACKWARD_COMPATIBILITY.md`. Both were derived
  from `AGENTS.md`, `.ai/lessons.md`, `README.md` and an inventory of the
  package exports, routes, entities, migrations and env vars.
- Added `.ai/{analysis,scripts,qa,specs}/.gitkeep`. Added the
  `.ai/qa/artifacts_*/`, `.ai/qa/test-env.json` and `.ai/qa/test-env.env`
  ignore rules.
- Cross-skill coverage check: `SKILL_COVERAGE_OK`.

## Key decisions

- **The validation gate excludes `test:integration`** (user's choice, for
  speed). The gate is lint → typecheck → test:coverage → build. CI still runs
  integration tests, the `protect-main` ruleset requires them, and `AGENTS.md`
  still requires them locally. `SDLC.md` and `CODE_REVIEW.md` both say so.
- **Migration rollback:** `BACKWARD_COMPATIBILITY.md` asks new migrations
  to implement `down()` or state in the PR that they can't be reverted. The
  initial migration is up-only, as `README.md` documents.
- No spec was written. This is one-time tooling configuration produced by the
  skill itself, not a feature.

## Outcome

Success, with environment gaps:

- `jq` is not installed. The GitHub label guards and several tracker
  operations need it.
- `gh` is 2.46.0, older than the 2.82.1 the descriptor recommends. Mutations
  go through REST and still work, but `gh pr view`/`gh issue view` without
  `--json` can fail on the Projects (classic) deprecation.
- `protect-main` requires only the Unit and Integration checks. Lint,
  Typecheck and Build run in CI but are not required.
