# Run: README and foundation spec corrections

- **Date:** 2026-10-14
- **Branch:** `docs/readme-and-spec-fixes`.
- **Start commit:** `cc264a37fa694a6542fcd7b8ee91cbcd87e9de2d`.
- **Spec:** [Monorepo foundation](../specs/implemented/2026-10-13-monorepo-foundation.md).
- **Outcome:** success; requested documentation corrections verified.

## Asked

Fix the audit's README env-precedence and migration-rollback findings, and
append dated corrections for the foundation spec's stale configuration,
ORM access, and backend-route details. Preserve the original spec text.
Only README, that spec, and this required task log may change.

## Decisions and evidence

- Use repository source, package scripts, and installed dependency source
  to verify behavior; do not infer successful migration execution.
- The CLI wrapper calls `loadEnvConfig` without a development argument.
  Installed `@next/env` selects production files except under `NODE_ENV=test`,
  and preserves existing process variables and the first file value found.
- Root `db:migrate:down` delegates to the db workspace's
  `mikro-orm migration:down`. The only committed migration defines `up()`;
  inherited `down()` throws `This migration cannot be reverted`.
- An independent read-only check confirmed the foundation corrections
  against current source and initial foundation commit `d0b01cd`.
- Other audit findings are outside the requested corrections.

## Work and verification

1. Read the audit, README, foundation spec, and existing lessons.
2. Verified env behavior against `packages/db/mikro-orm.config.ts`, installed
   `node_modules/@next/env/dist/index.js`, and Next's installed environment
   variables guide. Checked root, app, and db package scripts.
3. Verified rollback behavior against the committed initial migration,
   installed `Migration.js`, and `MigrationCommandFactory.js`. No rollback
   command was executed against a database.
4. Verified the foundation details against `packages/db/src/config.ts`,
   `packages/db/src/register.ts`, `packages/app/src/server/container.ts`,
   the CLI wrapper, route directories, and initial implementation history.
5. README now states env load order, first-value precedence, CLI mode
   differences, and the rollback command's current limitation. Its env
   overview links to the detailed explanation.
6. Appended `Corrections (2026-10-14)` to the foundation spec. A comparison
   against HEAD confirms the entire original text is unchanged.
7. Checked both explicit local Markdown links in the three task files;
   targets exist. Confirmed exactly these three permitted files changed.

Validation:

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- `npm run test:coverage`: passed, 146 tests; 100% statements, branches,
  functions, and lines.
- `npm run test:integration:install`: passed; Chrome already installed.
- `npm run test:integration`: passed, 3 tests using ephemeral PostgreSQL.
  Evidence is in `test-results/integration/` (git-ignored).
- `git diff --check`: passed, including the finalized run log.

All requested behavior was verifiable in the repository and installed
dependencies. No unsupported behavior was added to the documentation.
