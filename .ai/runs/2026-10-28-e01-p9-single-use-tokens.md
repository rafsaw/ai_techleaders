# 2026-10-28 — E01 Phase 2 Step 1: single-use token records (P9)

**Asked:** implement accounts spec Phase 2 Step 1 only (`.ai/specs/2026-10-17-accounts-and-roles.md`, platform P9 in `.ai/specs/2026-10-17-platform-primitives.md`): the `singleUseTokenProperties` spread and the `inspectSingleUseToken` / `consumeSingleUseToken` helpers in `@devmentor/db`, with mocked-`em` unit tests. No entity, migration or container registration (Step 4 adds `email_confirmation_tokens`).

**Done:**
- `packages/db/src/entities/single-use-token.ts`: the spread (`tokenHash` `char(64)` unique, `expiresAt` datetime, `consumedAt` nullable datetime), styled like `baseProperties` / `AuthSession.tokenHash`.
- `packages/db/src/single-use-token.ts`: `TokenLookup<T>`, `SingleUseTokenRecord`, `inspectSingleUseToken`, `consumeSingleUseToken`. Malformed token → `invalid` with no query; lookup by `hashToken`; conditional `nativeUpdate` (`id`, `consumedAt: null`, `expiresAt > now`); reload with `em.refresh`. Nothing is logged.
- `packages/db/src/index.ts`: exports.
- `packages/db/src/single-use-token.test.ts` (23 tests): spread metadata via a throwaway test entity, every status for both helpers, malformed tokens (no query), raw token never passed to the DB, `expiresAt == now` → expired, 0-row update → `used` / `expired` / defensive `used`, row deleted meanwhile → `invalid`, DB error propagates.
- Spec: "Implementation notes (Phase 2)" added with this step's decisions.

**Decisions:**
- `used` takes precedence over `expired` when both hold (the effect already happened; the more useful reason to show).
- 0-row re-read: report the reloaded state (`expired` if lapsed unused, else `used`); a re-read that still looks usable reports `used`, never `valid`/`consumed`; a vanished row reports `invalid`.
- Reload after a successful update as well, so the identity map matches the DB for the caller's later flush.
- AGENTS.md not changed (Step 8 does the documentation).

**Gate:** lint (0 errors), typecheck, `test:coverage` (67 files, 1102 tests, 100% statements/branches/functions/lines per file; both new files in the report), build — all pass. Integration not run: nothing integration-relevant touched.

**Outcome:** success.
