# Spec drift and env precedence lessons

- Branch: `docs/lessons-spec-drift`; start commit: `ab93ee7`.
- Spec reference: `.ai/specs/implemented/2026-10-13-monorepo-foundation.md`.
- Request: add two verified lessons at the top of `.ai/lessons.md`, preserve
  existing entries, and write this short run log. No other files may change.
- Work: checked the foundation spec's Corrections section against DB config,
  registration, app composition and backend routes; checked CLI env loading
  against the installed `@next/env` implementation and README's Configure env.
- Decisions: record the related domain-services lesson, completion checklist
  enforcement and the `NODE_ENV=test` exception. No spec changes are needed
  for this documentation-only update; the existing corrections match code.
- Verification: lint, typecheck, build and unit coverage passed (146 tests;
  100% statements, branches, functions and lines). Browser installation passed.
  Preservation check confirmed exactly two template entries and byte-for-byte
  preservation of all prior content; `git diff --check` passed. All three
  integration tests passed against fresh migrated PostgreSQL.
- Outcome: only `.ai/lessons.md` and this requested run log changed;
  both lessons verified and all required gates passed.
