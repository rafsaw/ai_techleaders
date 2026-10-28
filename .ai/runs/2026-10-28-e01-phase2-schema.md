# 2026-10-28 — E01 Phase 2, step 2.4: schema and migration

**Asked:** ship the Phase 2 schema (`users.password_hash`, `email_confirmation_tokens`, `rate_limit_buckets`) as one migration with `down()`, migration unit test, the integration round trip, and real-PostgreSQL tests of the rate limiter (and optionally P9 consume) against the migrated tables. No services/routes (step 2.5).

**Done:**
- `User.passwordHash` (`varchar(60)`, null); new `EmailConfirmationToken` entity in `packages/db/src/entities/auth/` (baseProperties + singleUseTokenProperties, indexed cascading `user`, `email varchar(254)`), listed in `entities` and exported from `@devmentor/db`.
- `Migration20261028165323` via `npm run db:migration:create`; generated SQL kept, `down()` reordered to the exact reverse of `up()`. Unit test `packages/db/src/accounts-phase2-migration.test.ts`.
- Local DB: `db:migrate` → applied; `db:migrate:down` → reverted; `db:migrate` → applied; `migration:check` → no changes.
- `UserService` test proving no DTO carries `passwordHash`; entity and config tests updated.
- Integration: `scratch-database.ts` helper (scratch DB per describe + `dbContainer`), Phase 1 round trip moved onto it, new Phase 2 round trip, new `db-primitives.test.ts` (limiter + P9 consume incl. a concurrent race).

**Decisions:** recorded in the accounts spec, "Implementation notes (Phase 2)", Schema and Real-PostgreSQL tests bullets. `signInMethods.password` left `false` for step 2.5.

**Outcome:** success. lint (0 errors), typecheck, test:coverage (74 files, 1167 tests, 100% per file), build, test:integration (4 files, 43 tests) all pass.
