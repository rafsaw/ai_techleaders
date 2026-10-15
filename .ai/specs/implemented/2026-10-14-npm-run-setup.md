# Idempotent `npm run setup` for local development

Refs: #13

## 📝 TLDR

Today a developer setting up DevMentor locally works through six manual steps in
README › Local setup. **Proposed:** a single `npm run setup` that runs those steps in
order. Each step checks first whether it is already done and skips it if so, so the
command can be re-run safely at any time. It also works without Docker when a
`DATABASE_URL` is already exported, as in the course Sandbox. The change is dev tooling
only: no app code, schema or API contract changes.

## 📝 Problem Statement

- Onboarding today means six manual steps: prerequisites, `npm install`,
  `docker compose up -d` and waiting for `healthy`, creating `packages/app/.env`, and
  `npm run db:migrate`. Each one is a place to get stuck, for example by running a
  migration before Postgres is healthy or by creating `.env` in the wrong directory
  (see `.ai/lessons.md`, "Check env file precedence before debugging migrations").
- After a `git pull`, people forget to re-run `npm install` or `db:migrate`. A command
  that can safely be re-run fixes that drift.
- The course Sandbox has no Docker. It exposes a running PostgreSQL through
  `DATABASE_URL`. The manual steps assume Docker, so Sandbox users have to work out
  which steps to skip.

## 📝 Proposed Solution

Add a Node script with no dependencies, `scripts/setup.mjs`, exposed as
`"setup": "node scripts/setup.mjs"` in the root `package.json`. The script is a fixed
list of **steps**. Each step has a `check` (is it already done?) and an `action` (do
it). The runner prints one line per step and stops at the first failure.

| # | Step | Done-check (skip when true) | Action |
|---|------|-----------------------------|--------|
| 1 | Prerequisites | — (always runs) | Node `process.versions.node` ≥ 22.17.0. Unless `DATABASE_URL` is set: `docker info` and `docker compose version` succeed. |
| 2 | Dependencies | `node_modules/.package-lock.json` exists **and** its mtime ≥ the newest mtime of `package-lock.json`, the root `package.json` and every `packages/*/package.json` | `npm install` |
| 3 | PostgreSQL | `DATABASE_URL` set in the environment → skipped (reason: environment). Otherwise: the `postgres` service in `docker compose ps --format json` has `Health: "healthy"` | `docker compose up -d --wait` |
| 4 | Env | `DATABASE_URL` set → skipped (reason: environment). Otherwise: `packages/app/.env` exists | copy `packages/app/.env.example` → `packages/app/.env` (exclusive create; never overwrites) |
| 5 | Migrations | stdout of `npm run -s migration:pending -w @devmentor/db` contains `No pending migrations` | `npm run db:migrate`. On a non-zero exit, fail with a hint naming `DATABASE_URL`. |

On success it prints `Next: npm run dev`. It never starts the dev server.

**Alternatives considered**

- *Shell script (`setup.sh`).* Rejected. It isn't testable under the Vitest 100%
  per-file gate, and it is less portable than Node, which every contributor already has.
- *TypeScript via `tsx`.* Rejected. The script must run **before** `npm install`, so it
  can use only Node built-ins. Node 22.17 cannot strip types without a flag. (The
  maintainer confirmed this on #13.)
- *Always run `docker compose up -d --wait` / `npm install` / `db:migrate`
  unconditionally.* These commands are mostly idempotent on their own. But that fails
  the "reports each step as skipped" acceptance criterion, and `npm install` adds
  10–60 s to every re-run.

**Prior art.** Rails `bin/setup` and GitHub's "Scripts to Rule Them All" (`script/setup`)
take the same approach: one idempotent, fail-fast entry point that says which step
failed. We follow them but leave out their database reset/seed behaviour, which is a
non-goal here.

## 📝 Architecture

Repo tooling only. The script lives outside every workspace package, so the package
dependency rules don't apply to it. It runs the existing root scripts and
`docker-compose.yml` as child processes and imports nothing from `packages/*`.

```
scripts/
  setup.mjs          entry: `process.exitCode = runSetup(steps, createContext(), console.log)`, no branches
  setup/
    steps.mjs        exported step objects { name, check, action } + helpers
    run.mjs          runSetup(steps, ctx, log): iterate steps, print status lines, stop on failure, return exit code
tests/
  setup-script.test.ts  unit tests (node project), mocks node:child_process + node:fs
                        (not `setup.test.ts`: avoids confusion with the Vitest file `setup-dom.ts`)
```

- **Process boundary.** Commands run through `spawnSync` with `cwd` set to the repo
  root, which is resolved from `import.meta.url`, so `node scripts/setup.mjs` works from
  any directory. `npm run setup` itself is a root script: run it from the repo root,
  like every other command in README. Action commands use `stdio: "inherit"` so the user sees
  `npm install` and `docker` progress. Check commands capture their stdout.
- **Env loading is untouched.** "`DATABASE_URL` is set" means
  `process.env.DATABASE_URL` is a non-empty string in the setup process, the wording
  the maintainer used on #13. The script never reads or parses `.env*` files (see A6). The MikroORM CLI keeps its existing precedence, where
  process env beats files, so in the Sandbox the migration step uses the exported URL
  automatically.
- **Status output contract** (one line per step):
  - `✔ <Step> — done` when its action ran
  - `↷ <Step> — skipped (<reason>)` when already done, or `(using DATABASE_URL from environment)`
  - `✖ <Step> — failed: <what> → <fix>` and exit code 1

  Exit code 0 only when every step is done or skipped. The URL value is never printed.

## 📝 Edge Cases & Failure Scenarios

| Situation | Behaviour |
|-----------|-----------|
| Node < 22.17 | `✖ Prerequisites — failed: Node <ver> is older than 22.17.0 → install Node ≥ 22.17.0`, exit 1, nothing else runs |
| Docker CLI missing / daemon down (no `DATABASE_URL`) | `✖ Prerequisites` naming `docker info` or `docker compose version`; fix hints: start Docker Desktop / enable WSL integration, **or** export `DATABASE_URL` |
| `package-lock.json` or any `package.json` changed by `git pull` | its mtime is newer than the hidden lockfile → `npm install` runs |
| Package folder deleted by hand, hidden lockfile intact | not detected (accepted, see A2); `rm -rf node_modules` forces a reinstall |
| Postgres container stopped | not `healthy` → `docker compose up -d --wait` starts it and blocks until the healthcheck passes |
| Port 5432 taken | `docker compose up` fails → `✖ PostgreSQL` with hint to remap the port per README (no auto-remap, non-goal) |
| `docker compose ps` JSON shape varies (array vs. NDJSON by Compose version) | parser accepts both; unparseable output → treated as "not healthy" → action runs |
| `.env` deleted | only the Env step runs on re-run |
| `.env` already exists with custom values | skipped, never overwritten |
| `.env.example` missing | `✖ Env — failed` naming the file |
| Database unreachable | `migration:pending` **exits 0** with no stdout when the connection is refused (verified locally), so its exit code is not a usable signal. The step treats missing `No pending migrations` text as "pending" and runs `db:migrate`, which exits 1 → `` ✖ Migrations — failed: `npm run db:migrate` failed → check DATABASE_URL (exported, or in packages/app/.env) and that PostgreSQL is reachable `` |
| `DATABASE_URL` exported but `packages/app/.env` also present | Env step skipped (environment reason). Process env wins in both loaders, per README precedence table |
| `DATABASE_URL` only in `packages/app/.env*` (e.g. remapped port, non-Docker DB), not exported | Treated as the Docker path: Prerequisites requires Docker and PostgreSQL runs `docker compose up`. To use your own database, export it for the run: `DATABASE_URL=… npm run setup`. README › Quick setup says this. (A6) |
| `npm run setup` invoked inside `packages/<pkg>` | npm reports "Missing script" (npm's normal behaviour). Run it from the repo root. |

## 📝 Risks & Impact Review

- **Surfaces changed:** a new root `setup` script, plus `vitest.config.ts`
  `coverage.include` and `tests/tsconfig.json`. No existing `BACKWARD_COMPATIBILITY.md`
  surface changes. Because README and AGENTS.md document `setup`, it joins the §6
  "Repository scripts and commands" list from then on. Rollback is deleting the files
  and the script entry.
- **Local DB side effect:** the script runs existing migrations against whatever
  `DATABASE_URL` resolves to. That is the same as running `npm run db:migrate` by hand,
  with no new risk. It never runs `migration:down`, `schema:update` or a reset.
- **Secrets:** the script never prints the `DATABASE_URL` value or `.env` contents.
  Child-process output is inherited unchanged, so what MikroORM prints on a connection
  error is the same as today. Unit tests can assert only the script's own status lines
  never contain the URL; inherited child output is outside what a unit test can observe.
- **Typecheck config:** importing `.mjs` from a `.ts` test needs `"allowJs": true` in
  `tests/tsconfig.json` only (no `checkJs`), which is scoped to repo tooling tests. The
  imported scripts are pulled in automatically, so the `include` list stays as is. The
  base config is unchanged.
- **Docs drift:** AGENTS.md › Testing lists the coverage scope as workspace `src` plus
  `eslint.config.mjs`. It must also name `scripts/**/*.mjs` (plan step 4).

## Resolved assumptions (autonomous defaults)

The maintainer already answered the questions on #13: plain `.mjs`, no `npm run dev`
at the end, unit tests only, `migration:pending` as the migration check, and the
Docker-less `DATABASE_URL` path. The table covers only the gaps left after that.

| # | Question | Assumed answer | Rationale |
|---|----------|----------------|-----------|
| A1 | Support native Windows shells (not WSL)? | **No.** POSIX/WSL/macOS only. README already requires WSL. | Avoids `npm.cmd`/`shell: true` special-casing. Can be added later without changing the contract. |
| A2 | Is the hidden-lockfile mtime check good enough for Dependencies? | **Yes.** Skip when `node_modules/.package-lock.json` mtime ≥ the newest mtime of `package-lock.json`, the root `package.json` and every `packages/*/package.json`. | Verified on a real install: the hidden lockfile (13:19) is newer than the committed lockfile (13:00). A `git pull` that changes the lockfile bumps its mtime and triggers a reinstall. A full integrity check is npm's job. |
| A3 | How do we detect migrations when `migration:pending` exits 0 even on connection errors? | Match `No pending migrations` in stdout. Anything else → run `db:migrate` and trust its exit code. | Verified locally: `migration:pending` exits 0 on ECONNREFUSED and `migration:up` exits 1. |
| A4 | How should tests import the `.mjs` modules under typecheck? | `"allowJs": true` in `tests/tsconfig.json` only (the imports pull the scripts in). | Smallest change. It doesn't loosen the workspace packages' configs. |
| A5 | Should Prerequisites also check `docker compose` (the plugin), not just `docker info`? | **Yes**, both, and only when `DATABASE_URL` is not set. | The PostgreSQL step depends on the Compose plugin. Failing early names the real fix. |
| A6 | Should a `DATABASE_URL` that exists only in `packages/app/.env*` also skip Docker? | **No.** Only the process environment counts. README says to export it (`DATABASE_URL=… npm run setup`) to use your own database. | Matches the maintainer's wording on #13 ("set in the process environment"). Parsing `.env*` would mean re-implementing `@next/env` precedence before `npm install`. Can be widened later without breaking anyone. |

## 📋 Phasing

One phase. The command is only useful once all five steps exist.

## 📋 Implementation Plan

### Phase 1 — `npm run setup`

1. **Runner, entry and Prerequisites.**
   - Add `scripts/setup/run.mjs` (`runSetup(steps, ctx, log)`: status lines, stop on
     first failure, return exit code).
   - Add `scripts/setup/steps.mjs` with the Prerequisites step (Node version, plus
     Docker checks gated on `DATABASE_URL`).
   - Add `scripts/setup.mjs` as the entry and `"setup": "node scripts/setup.mjs"` in the
     root `package.json`.
   - Add `scripts/**/*.mjs` to `coverage.include` in `vitest.config.ts`. Set
     `allowJs` in `tests/tsconfig.json`.
   - Tests in `tests/setup-script.test.ts`: version pass/fail (boundary 22.17.0 vs 22.16.x),
     the Docker checks with and without `DATABASE_URL`, runner done/skipped/failed
     ordering and exit codes, and the entry setting `process.exitCode`. The entry test
     mocks `./setup/run.mjs`, imports the entry once, and resets
     `process.exitCode = undefined` in `afterEach` so a simulated failure cannot fail
     the Vitest run itself.
   - *Verify:* `npm run test:coverage` at 100% for the new files, plus `npm run lint`
     and `npm run typecheck`.
2. **Dependencies and PostgreSQL steps.** Add the mtime check (hidden lockfile
   missing, older or newer than the lockfile or any `package.json`) → `npm install`. Add a compose health parser for array
   and NDJSON shapes (healthy, unhealthy, absent, garbage) → `docker compose up -d
   --wait`. Add the `DATABASE_URL` skip path, with a test that the URL value never
   appears in output. Spawn failures map to `✖` lines with fixes. *Verify:* coverage
   100%.
3. **Env and Migrations steps.**
   - Env: exclusive copy that never overwrites, a missing-template failure, and the
     `DATABASE_URL` skip.
   - Migrations: skip on `No pending migrations`. Empty output (DB unreachable) leads
     to running `db:migrate`, and a non-zero exit gives the `DATABASE_URL` hint.
   - Print `Next: npm run dev` after a fully successful run.
   - *Verify:* coverage 100%. Then run `npm run setup` manually twice on a dev machine:
     the first run does the work and the second run skips everything and exits 0.
     Delete `.env` and re-run: only Env runs.
4. **README and AGENTS.md.** Add a "Quick setup" section at the top of `## Local setup`: what
   `npm run setup` does, the skip behaviour, and one sentence on the Docker-less path
   (export `DATABASE_URL`, which also covers a database configured only in `.env*`,
   per A6). Move the current steps 1–6 under "Manual setup
   (alternative)". "Daily workflow" and "Reset the database" stay unchanged.
   In AGENTS.md › Testing, add `scripts/**/*.mjs` to the documented coverage scope.
   *Verify:* `npm run lint`.
5. **Full gate and bookkeeping.** Run `npm run lint`, `npm run typecheck`,
   `npm run test:coverage`, `npm run build` and `npm run test:integration` (existing
   suite unchanged, with no new integration case per #13). Write the run log in
   `.ai/runs/`, and move this spec to `.ai/specs/implemented/` with a Corrections note
   if the code deviated.

## Corrections (2026-10-14, implementation PR #15)

- `runSetup` is synchronous and takes `(steps, ctx, log)`. Every step uses
  `spawnSync`, so the entry has no top-level `await`. The `ctx`
  (`env`, `nodeVersion`, `root`) comes from `createContext()` in
  `scripts/setup/steps.mjs`. The Architecture and Implementation Plan text above
  now reflects this.
- Verified during implementation: npm rewrites `node_modules/.package-lock.json`
  about 40 ms after `package-lock.json` on every install, including a no-op one.
  So the Dependencies check settles after a single install (A2). Re-checked in the
  #14 review on 2026-10-15: a no-op `npm install` left the hidden lockfile 44 ms newer.
- The Edge Cases table now uses the exact status strings from `scripts/setup/steps.mjs`.
  `BACKWARD_COMPATIBILITY.md` §6 lists `setup` (added in #15).
- Running setup inside a git worktree derives a different Compose project name.
  Without `COMPOSE_PROJECT_NAME`, it would try to start a second Postgres on port
  5432 and fail with the port hint. This is accepted and is outside the spec's scope.
