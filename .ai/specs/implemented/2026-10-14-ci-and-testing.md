# Pull request CI and testing

## Outcome

Every pull request runs independent build, lint, typecheck, unit coverage, and
browser integration checks. Existing TypeScript runtime source and every new
feature must reach 100% statements, branches, functions, and lines per file.
Tests assert behavior and error paths, rather than only executing code.

## Design

- Use Vitest and its matching V8 coverage provider as repository-wide tooling.
  Node tests cover core, persistence metadata/configuration, services, routes,
  and composition. React Testing Library with jsdom covers app and UI rendering,
  interactions, loading, validation, errors, and pagination.
- Include all `packages/*/src/**/*.{ts,tsx}` in coverage, including unimported
  files and generated shadcn primitives, plus the executable root ESLint
  configuration. Its repository tooling tests live in `tests/`.
  Exclude only test helpers/tests and
  type-only declarations (which have no executable code). Cover migration SQL
  and rollback when implemented as units; validate migration application through integration.
- Colocate unit tests with their source, except migration tests reside one level
  above the migrations directory to avoid CLI discovery. Keep package boundaries.
  Test doubles may replace external resources, server-only markers, fonts,
  and Next request APIs. Async page orchestration can be invoked directly with
  dependencies replaced; real server rendering is checked by browser tests.
- App-owned integration tooling uses Vitest, Testcontainers PostgreSQL, and
  the agent-browser CLI. No separately authored Playwright tests. Start an
  isolated container, apply committed migrations, start the built app on an
  available loopback port, poll readiness, and stop browser/server/container
  on success or failure. Never use the developer database or edit env files.
- Browser cases: home heading and navigation; admin database status and empty
  count; users empty state, invalid form feedback, successful creation,
  persistence on reload, duplicate-email feedback. Fixtures use unique emails.
  Browser commands use semantic roles/labels and scoped sessions.
- GitHub Actions runs on pull_request, base pushes, and workflow_dispatch;
  read-only permissions, cancellation of obsolete runs, Node 22, npm ci,
  bounded jobs, coverage and integration logs/screenshots uploaded even on
  failure. Integration consumes the successful build artifact and uses Docker
  on Ubuntu runners; no repository secrets required.
- README documents commands/prerequisites. AGENTS requires per-file 100%
  unit coverage for each feature and passing integration tests before completion.

## Failure handling and limits

Docker/browser availability errors fail visibly; never skip integration tests.
Test readiness has a deadline and reports server logs. Cleanup is bounded and
does not mask test failures. Coverage is a regression gate, not a claim that
all possible application behavior has been proven. Branch protection is a
GitHub setting separate from the committed workflow.

## Implementation Plan

1. Review this design against package boundaries and installed Next testing docs.
2. Install test tooling, configure aliases/environments and strict coverage.
3. Add behavioral units for all existing runtime source, iterate to 100%.
4. Add ephemeral integration lifecycle and agent-browser smoke/CRUD scenarios.
5. Add GitHub Actions, testing rules, and contributor documentation.
6. Run lint, typecheck, build, coverage, and integration; resolve failures and
   move this spec to implemented only after all gates pass.

## Review and verification

Design and final implementation received independent agent review. Migration
test discovery and Base UI navigation roles were corrected before completion.
Verified after `npm ci`: production build, lint, all workspace/tooling
typechecks, 146 unit tests, and 3 browser integration scenarios pass.
Coverage reports 43 runtime files at 100% statements (340), branches (173),
functions (146), and lines (310); four type/export-only files have no runtime.
Fresh PostgreSQL migration application, screenshots of home/admin/validation/
creation/duplicate feedback, and teardown were exercised locally. GitHub's
hosted workflow will execute once these changes are pushed; repository branch
protection/rulesets are separate settings.

## PR #2 coverage audit and rendering follow-up

Audited [PR #2](https://github.com/rafsaw/ai_techleaders/pull/2), base
`d0b01cdc53824ed0af54f50ad2ee8317c7d2c543`, head
`94ef06360aeeee226c170a00e0fef3cc19206b76`, against the measured coverage report.
Its surviving production source matches the PR head. Every changed executable
source/configuration file has 100% statements, branches, functions, and lines;
coverage checks the whole file, including code outside the changed lines.

| Changed code | Runtime files | Covered lines | Covered statements | Covered functions | Covered branches |
| --- | ---: | ---: | ---: | ---: | ---: |
| App | 8 | 57 | 59 | 25 | 18 |
| Core | 7 | 66 | 76 | 33 | 37 |
| Database | 2 | 3 | 3 | 0 | 0 |
| UI | 15 | 148 | 163 | 65 | 108 |
| ESLint configuration | 1 | 3 | 4 | 1 | 0 |
| Total | 33 | 277 | 305 | 124 | 163 |

Three other changed files (`server/cradle.ts`, core's barrel, and db's barrel)
have no executable statements. The removed old `errors/app-error.ts` has no
remaining code to execute. Markdown, package manifests, and lockfiles are data.

Additional units prove that stale GET success/error responses cannot overwrite
the users list after a successful create/reload, check dashboard/users metadata,
and exercise both forbidden and permitted imports through the actual ESLint API.
Separate browser cases load `/` and `/backend`, verify document titles, visible
headings/controls, semantic landmarks, navigation, and the connected empty
PostgreSQL state. Users creation/persistence/validation remains the third case.
All three pass against the production app and a fresh migrated container.
