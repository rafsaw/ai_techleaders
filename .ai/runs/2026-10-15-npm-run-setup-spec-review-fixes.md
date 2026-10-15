# Run: npm-run-setup spec review fixes

- **Date:** 2026-10-15
- **Branch:** `spec/npm-run-setup` (PR #14). The `BACKWARD_COMPATIBILITY.md` change went to `feat/npm-run-setup` (PR #15).
- **Start commit:** `9529b8028a5ab70fc33ef051bcb571120bce98af`.
- **Spec:** [Idempotent npm run setup](../specs/implemented/2026-10-14-npm-run-setup.md).
- **Outcome:** success. All four `om-code-review` findings on #14 are fixed.

## Asked

Fix every finding from the `om-code-review` of PR #14 (verdict: approve, with three minors and one nit).

## Work

- **A2 matched to the step table.** The Dependencies freshness check compares against `package-lock.json`, the root `package.json` and every `packages/*/package.json`, as `newestManifestMtime()` in #15 does.
- **Status strings matched to the code.** The Node-version and migrations-failure rows in Edge Cases now quote the exact messages from `scripts/setup/steps.mjs`.
- **Corrections bullet 2 re-verified.** A no-op `npm install` on this branch rewrote both lockfiles, and `node_modules/.package-lock.json` came out 44 ms newer than `package-lock.json`. The working tree stayed clean.
- **BACKWARD_COMPATIBILITY.md §6.** Once README and AGENTS.md document `setup`, it becomes a protected script. Risks & Impact now says so, and #15 adds `setup` to the §6 list.

## Not changed

The merge-order note ("Merge #14 before #15") is a process decision, not a defect. Merge the two PRs back to back.

## Verification

`npm run lint`, `npm run typecheck`, `npm run test:coverage` and `npm run build` were run on both branches after the edits (#15 from a fresh `npm ci` worktree):

| Command | #14 | #15 |
|---------|-----|-----|
| `npm run lint` | pass | pass |
| `npm run typecheck` | pass | pass |
| `npm run test:coverage` | pass (100%, 340/340 statements) | pass (100%, 422/422 statements) |
| `npm run build` | pass | pass |
