# AGENTS.md task router

**Asked:** run `/task-router`: split the root `AGENTS.md` into a short router plus per-unit files, with a check that every route exists (interactive session).

**Did:** cut the root from 659 to 145 lines (summary, Task Router, stack, layout, hard rules, commands, working rules, one gotcha). Moved the rest into `packages/{app,core,db,ui}/AGENTS.md`, `packages/app/src/server/AGENTS.md`, `packages/app/src/server/services/auth/AGENTS.md`, `packages/app/tests/integration/AGENTS.md` and `.ai/AGENTS.md`, each with a `CLAUDE.md` containing only `@AGENTS.md`. Added `scripts/check-agents.mjs`, `scripts/check-agents/run.mjs`, `tests/check-agents.test.ts` and `npm run check:agents`. Fixed pointers in `CODE_REVIEW.md` and `README.md`.

**Key decisions:**

- `app` rules do not fit one 120-line file, so the server zone, auth services and integration tests got nested files. Rules used across units went to the unit that acts on them.
- Dropped lines come from the no-op audit's CUT and MERGE findings in `no-op-report.md`, plus lines the split made false.
- Kept the Next managed block in the root as well as `packages/app`, because lesson 2026-10-13 requires both, even though `next dev` writes only `packages/app/AGENTS.md`.
- Kept the "Only path to `mentor`" rule in the root, as the audit recommended, because it is a security rule that any route could break.
- The check runs inside `npm run test:coverage` through a test on this repository, so CI enforces it with no workflow change.
- No spec: the skill excludes spec edits and defines the work itself.

**Validation:** lint, typecheck and `test:coverage` passed (100% on all files). `build` passed after allowing `fonts.googleapis.com` and `fonts.gstatic.com`; the sandbox blocks them by default. `check:agents` passed (16 routes). A scripted comparison of old and new text found no rule lost beyond the drop list. The Next block still matches the installed version in both files.

**Not verified:** `test:integration` could not run. The sandbox denies access to `/var/run/docker.sock`, so setup failed before any test. The change touches only Markdown, one root script and its test, but the required gate step is still open.

**Outcome:** partial. The router is in place and checked; the integration step awaits a run outside the sandbox. Nothing is committed. `AGENTS.rewrite.md` and `no-op-report.md` are left untouched and now describe the old root.

**Correction (same day, after review):** the "no rule lost" validation claim above was wrong. It came from a text-overlap heuristic, which missed rules moved to files that do not load for the code they govern, and a dropped completion check. Those four high findings are now fixed in `AGENTS.md`, `packages/app/AGENTS.md`, `packages/app/src/server/AGENTS.md` and `packages/app/src/server/services/auth/AGENTS.md`. The user's process decisions were applied at the same time, and the E02 notes moved to `.ai/specs/2026-10-18-mentor-setup.md`. Under those decisions this interactive task did not need a run log, so no second log was written.
