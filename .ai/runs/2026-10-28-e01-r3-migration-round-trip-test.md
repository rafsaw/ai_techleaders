# 2026-10-28 — E01 review R3: migration up/down integration test

**Asked:** confirm and fix review issue R3 — no integration test ran the Phase 1 migration (`Migration20261028002328`) up and down against a real PostgreSQL database. Spec: `.ai/specs/2026-10-17-accounts-and-roles.md`.

**Confirmed:** the spec requires each phase's migration to have "a working `down()`" that "remains tested for disposable environments" (Data model, Risks/rollback, Phase 1 step 5 "a migration test"); `BACKWARD_COMPATIBILITY.md` §4 requires `down()` so `npm run db:migrate:down` reverts it. Coverage was only `packages/db/src/accounts-migration.test.ts` (asserts SQL text) and the integration global setup (applies migrations up once). Nothing executed `down()`, the backfill or the constraints on a database.

**Done:**
- `packages/app/tests/integration/migrations.test.ts` (6 cases): creates a separate database in the integration container (dropped `with (force)` in `afterAll`; the container teardown removes it in any case), then via the real CLI (`npm run db:migrate -- -- --to <name>`, `npm run db:migrate:down -- -- --only <name>`): baseline only + pre-existing users → Phase 1 up (exact columns, constraint definitions via `pg_get_constraintdef`, `auth_sessions_user_id_index`, one `mentee` per user, user rows byte-identical incl. microsecond timestamps) → constraint checks (unique user+role, role check, FK, unique token_hash, unique github_id, cascade on user delete) → Phase 1 data → down (only `users` left, baseline columns/constraints, original rows) → up again (backfill re-runs, Phase 1 data gone as documented). Every step asserts `mikro_orm_migrations`, because MikroORM silently ignores an unknown `--to` name.
- `packages/app/tests/integration/npm.ts`: `runNpm` extracted from `app.test.ts` and shared.
- Spec implementation note added.

**Decision — separate database, same container:** `down()` drops tables the app and the other scenario need, so it cannot run on the shared DB. A sibling database is fully isolated (own schema and migrations table), runs the same server version and needs no second container start. The integration config already picks up `tests/integration/**/*.test.ts`, so CI's `npm run test:integration` runs it with no config change.

**Migration review:** no defect found; `down()` drops only Phase 1 objects and the backfill is correct on re-apply. The migration was not edited.

**Outcome:** success. Not committed.
