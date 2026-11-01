# PR #62 review and autofix

Asked to run `om-auto-review-pr` on PR #62 (E02-S01 Phase 1). The PR author is the running account, so the autofix loop applied.

## What the review found

The review at `db97645` was posted as a comment because GitHub refuses a change request on your own PR.

- Blockers: no integration evidence for the profile write API, and no rollback plan in the PR body.
- Major: the QA launcher could serve an old build while recording the current head.
- Minor: stale-PID teardown, no stale-lock recovery, wrong textarea line numbers, NUL reaching PostgreSQL, QA tooling missing from the PR description.
- Nits: stale E01 wording in two UI docs, `priceDollarsSchema` missing from the compatibility list, and the empty-price message.

## What changed

- `tests/integration/mentor-profile.test.ts`: denied writes, refused prices and NUL, replacement in one row, a forced concurrent first save, and isolation between mentors.
- `mentor-profile.schema.ts`: link messages name the real textarea line; control characters in links and NUL in descriptions are field errors. The spec's validation table records this.
- `.ai/scripts/test-env-*.sh`: rebuild unless the build came from the current clean head, never signal a stale PID, recover a dead lock owner.
- PR body: rollback plan and the QA tooling in scope.
- `.ai/lessons.md`, UI docs and `BACKWARD_COMPATIBILITY.md` updated.

## Decisions

- Empty-price message kept: the spec fixes `z.coerce.number()` with one message per bound, and this is only a wording nit.
- Lock recovery stays minimal: a live owner still fails immediately rather than the contract's poll-wait, following the project's simplest-sufficient preference.
- The PR stays in `review`, not `merge-queue`: this account cannot approve its own PR, and it wrote these fixes, so it is not the second person `risk-high` requires.

## Verification

Local at the fix head: lint, typecheck, build, `check:agents` and `check:tokens` pass; 1,952 unit tests at 100% per-file coverage; 159 integration tests. The launcher was run with real containers for missing, matching and mismatched build markers, reuse, teardown, stale and live locks, and a throwaway PID under `stopped` and `running` descriptors.

Storybook was not run locally; CI covers it.

## Outcome

Author-side re-review is clean. Independent code review and independent QA are still required, and the existing browser evidence predates the validator change.
