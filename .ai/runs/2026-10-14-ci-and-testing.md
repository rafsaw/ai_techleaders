# Run: implement CI and testing

- **Date:** 2026-10-14
- **Branch:** `main`
- **Start commit:** `37227d67b327c4afe7db952afd71a1bf87040de0`
- **Spec:** [.ai/specs/implemented/2026-10-14-ci-and-testing.md](../specs/implemented/2026-10-14-ci-and-testing.md)
- **Outcome:** success. All local verification gates passed; changes remain
  uncommitted and unpublished. This log was added retrospectively after the
  user identified its omission.

## Asked

Set up GitHub CI for every pull request with build and lint checks, a
TypeScript unit test framework, and integration tests using Testcontainers
PostgreSQL and agent-browser. Require 100% unit coverage for every new feature
in AGENTS.md, cover existing code, and verify homepage and admin rendering.

The follow-up request explicitly required 100% coverage of the code changed
in [PR #2](https://github.com/rafsaw/ai_techleaders/pull/2) and separate
homepage/admin rendering tests.

## Decisions

- **Unit testing:** use Vitest with its matching V8 coverage provider, React
  Testing Library, and jsdom. Enforce 100% statements, branches, functions,
  and lines per file, including unimported source and generated UI primitives.
  Include the executable ESLint configuration in the coverage gate too.
- **Package boundaries:** keep repository test tooling at the root and
  app/UI test dependencies in their respective workspaces. Colocate source
  tests, put tooling tests in `tests/`, and put migration tests one level
  above `src/migrations/` to avoid MikroORM discovery.
- **Node compatibility:** use jsdom 26.1 rather than 30, whose Node minimum
  would exceed the repository's existing Node 22.17 requirement.
- **Server units:** replace external resources and Next request/font APIs
  with test doubles. Invoke async page orchestration directly in units and
  verify actual server rendering through production browser integration.
- **Integration:** use a fresh PostgreSQL 17 container, committed migrations,
  an available loopback app port, and an isolated agent-browser session.
  Override `DATABASE_URL` only in child-process environments; never use the
  developer database or change its env files. Bound readiness and cleanup,
  and handle cancellation as well as success/failure.
- **Browser assertions:** resolve fresh accessibility snapshot refs by
  role/name, wait for concrete content, and assert exact URLs. Save screenshots,
  snapshots, logs, and JUnit results in a unique directory per run.
- **CI:** run independent lint, typecheck, unit coverage, and build jobs;
  integration consumes the successful production build artifact. Use Node
  22.23.3, `npm ci`, read-only workflow permissions, job timeouts, and
  cancellation of obsolete runs. Upload coverage and browser evidence.

## Done

1. **Inspected the repository** and its existing specs, lessons, package
   boundaries, source code, and installed Next.js testing guides. Confirmed
   there was no automated test runner or GitHub CI workflow.
2. **Wrote and independently reviewed the CI/testing spec.** Recorded the
   implementation plan and complete-source coverage requirement before coding.
3. **Installed and configured the test tooling.** Added Node and jsdom Vitest
   projects, app/server-only aliases, DOM cleanup, strict coverage thresholds,
   root tooling typechecks, test scripts, and ignored generated test artifacts.
4. **Added behavioral unit tests** for core HTTP/error/validation/DI/logger
   code, shared schemas, database configuration/entities/migration/registration,
   app services/routes/composition/pages, client API transport, forms, tables,
   feedback states, and every existing UI primitive. The initial suite reached
   111 passing tests and 100% coverage.
5. **Built the integration lifecycle** in `packages/app/tests/integration/`:
   start ephemeral PostgreSQL, apply migrations, launch the production app,
   probe `/api/users` for readiness, and release browser/process/container
   resources. Added bounded subprocess handling and cancellation cleanup.
6. **Added and exercised browser scenarios** for home/admin navigation,
   database connectivity, empty users, invalid input, creation, persistence
   after reload, and duplicate-email feedback. Collected real-browser evidence.
7. **Added `.github/workflows/ci.yml`** for pull requests, pushes to `main`,
   and manual dispatch. Added artifact transfer from build to integration and
   report uploads even on test failure. Checked the workflow YAML structure
   and independently reviewed its artifact paths and package boundaries.
8. **Updated AGENTS.md, README, and lessons** with the mandatory 100% testing
   rule, commands, prerequisites, integration isolation, and discovered gotchas.
9. **Verified a clean `npm ci` installation** and the production build,
   lint, typecheck, coverage, and integration gates. Moved the implemented spec
   into `.ai/specs/implemented/` without renaming it.
10. **Audited PR #2** against base `d0b01cdc53824ed0af54f50ad2ee8317c7d2c543`
    and head `94ef06360aeeee226c170a00e0fef3cc19206b76`. Confirmed that surviving
    production source matches the PR head and every changed executable file
    has 100% coverage. Added stale user-list success/error regressions, page
    metadata assertions, and actual ESLint API tests for permitted/forbidden
    imports, Next workspace settings, and generated-output exclusions.
11. **Split homepage and admin rendering into separate integration cases.**
    Added actual document titles, visible headings/controls, semantic landmarks,
    direct admin loading, and navigation assertions. Retained users CRUD as
    the third case and reran the relevant verification gates successfully.
12. **Created this missing run log** following the engineering-standards
    example and added a lesson requiring the log before reporting completion.

## Problems encountered and resolutions

- **Sandbox restrictions:** dependency/browser downloads, Docker and browser
  sockets, font retrieval, Turbopack's local CSS worker, esbuild's install-time
  binary check, and a Git subprocess required approved escalation. Reran the
  affected commands with that access. A cached Turbopack permission failure
  persisted after escalation; moved generated `.next` output into `/tmp` and
  performed a clean successful build.
- **Migration test discovery:** MikroORM treated a colocated
  `Migration*.test.ts` as a migration and imported Vitest outside its runner.
  Moved the test to `packages/db/src/migration.test.ts`; fresh migration
  application then passed.
- **Base UI navigation role:** `View site` renders an anchor with
  `role="button"`. Corrected unit/browser locators to the observed button role.
- **Installed runner/CLI differences:** Vitest 5 did not support the attempted
  `describe.sequential` API, so used runner-level sequential configuration.
  agent-browser's documented semantic `find` and wildcard URL wait failed
  despite the expected rendered page. Used freshly discovered snapshot refs,
  content readiness, and exact `get url` assertions instead.
- **Snapshot formatting:** Chrome exposed the CSS-uppercase branding in
  uppercase, and landmarks appeared as `- main` rather than `main:`. Made the
  branding assertion case-insensitive and matched actual landmark lines.
- **Dependency compatibility:** jsdom 30 required a newer Node version than
  the project minimum. Installed jsdom 26.1 and verified the suite again.
- **Missing run log:** completion was reported without the required `.ai/runs/`
  artifact. Added this log retrospectively and recorded the user's correction
  in `.ai/lessons.md`.

## Verification

These are the final executed results of the CI/testing implementation and
PR #2 follow-up; the retrospective log-only change did not rerun the suites.

- **`npm ci`:** passed, verifying installation from the project lockfile.
- **`npm run test:coverage`:** 146 unit tests passed across 18 test files.
  All 43 executable files reached 100% coverage per file:
  - statements: 340/340,
  - branches: 173/173,
  - functions: 146/146,
  - lines: 310/310.
  Four type/export-only files had no executable statements. No runtime source
  was omitted to satisfy the thresholds.
- **PR #2 audit:** all 33 changed executable source/configuration files reached
  100% on all four metrics: 305 statements, 163 branches, 124 functions,
  and 277 lines. Three surviving changed files had no executable code;
  the deleted old error file had no remaining code to test.
- **`npm run test:integration`:** all 3 tests passed against a production app
  and fresh migrated Testcontainers PostgreSQL:
  - homepage title, visible content, landmarks, and admin navigation,
  - direct admin rendering, title, visible navigation, connected database,
    empty user count, and return navigation,
  - users validation, normalized creation, persistence on reload,
    duplicate-email feedback, and updated dashboard count.
- **`npm run build`, `npm run lint`, `npm run typecheck`:** all passed.
- **Evidence:** coverage HTML/LCOV/JSON under `coverage/`; JUnit, browser/app/
  database logs, accessibility snapshots, and screenshots under
  `test-results/integration/`. Cleanup ran on successful and failed attempts.
- **`git diff --check`:** passed for the implementation changes.

## Not done or deferred

- Changes have not been committed or pushed, so the hosted GitHub Actions
  workflow has not executed. The reported verification is local.
- GitHub branch protection/rulesets must make the five CI check names required
  to prevent merging a failing PR; those settings were documented but not changed.
