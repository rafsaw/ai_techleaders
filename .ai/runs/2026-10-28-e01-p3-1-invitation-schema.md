# 2026-10-28 — E01 Phase 3, task 3.1: mentor invitation schema

**Asked:** ship the Phase 3 schema: `mentor_invitations` (bound email, single-use token columns, `revoked_at`, accepted-user FK, partial unique open-email index, no note or raw token storage) and `user_roles.invitation_id`, as one migration with a working `down()`, a migration unit test, entity tests and a Phase 3 block in the real-PostgreSQL round trip. No services, CLI, routes or pages (3.2+).

**Done:**
- New `MentorInvitation` entity (`packages/db/src/entities/auth/mentor-invitation.entity.ts`): `baseProperties` + `singleUseTokenProperties`, `email varchar(254)`, `revokedAt`, `acceptedBy` → `accepted_by_user_id` (FK `users`, on delete set null), partial unique `mentor_invitations_open_email_unique` on `email WHERE consumed_at IS NULL AND revoked_at IS NULL`. Listed in `entities`, exported from `@devmentor/db`.
- `UserRole.invitation` (`invitation_id`, nullable FK, on delete set null) plus check `user_roles_invitation_mentor_check` (`invitation_id IS NULL OR role = 'mentor'`).
- `Migration20261028212643` via `npm run db:migration:create`; `up()` as generated, `down()` rewritten as the exact reverse.
- Local DB: `db:migrate` → applied; `db:migrate:down` → reverted; `db:migrate` → applied; `mikro-orm migration:check` → no changes.
- Tests: `packages/db/src/accounts-phase3-migration.test.ts`; `entities.test.ts` and `config.test.ts` updated; `packages/app/tests/integration/migrations.test.ts` Phase 3 round trip (6 tests).
- Spec: data-model table note and mermaid labels; new "Implementation notes (Phase 3)" with the Step 1 decisions. `track.md` 3.1 ticked.

**Decisions:** see the spec's "Implementation notes (Phase 3)": partial index via MikroORM `uniques[].where` (no hand-written SQL), no plain `email` index, `invitation_id` on delete set null, DB check for mentor-only `invitation_id`, entity in the `auth` concept folder.

**Gate:** lint 0 errors (1 pre-existing warning in `.agents/skills/…`), typecheck clean, test:coverage 89 files / 1711 tests, 100% statements/branches/functions/lines, build ok, test:integration 7 files / 61 tests passed.

**Outcome:** success.
