# Stripe status banner fix (revision-002) and lesson-07 progress update

- Request: on branch `feat/lesson-07-prototype` / PR #54: (1) update `lekcja-07/POSTEP.md` to the confirmed results, keeping history and limitations; (2) reproduce the contradictory "Stripe is checking" and "You are bookable" messages in `revision-002`, fix presentation only if confirmed, check checking → bookable and the failure state; do not change D05, the definition of bookable, Ready, or the Stripe/Slots order; keep the persona report historical and record the fix separately. No commit, push or merge. (3) Translate the PR title and description to English.
- Started: 2026-10-27, branch at `d38fcd4`, clean worktree. Changes left uncommitted for the PO.

## What was done

- **Reproduction (before any edit):** Playwright (Chromium, `file://`, 1280 px) walked invitation → GitHub sign-in → accept → profile → Stripe stand-in → "Submit my details" → "Check status". Defect confirmed: the notice "Back from Stripe. Stripe is checking your details." (`ui.notices`, id `back`, route `mentor`) is never removed, so it shows above "You are bookable. / Payouts confirmed" and above "Blocked" / "Not bookable yet". 3 assertions red.
- **Fix:** one statement in `checkStripe()` in `.ai/prototypes/discovery/mentor-onboarding/revision-002/index.html` drops the `back` notice when the check returns. Nothing else touched in the prototype logic.
- **After the fix:** 10 checks green: checking state, checking → bookable, checking → blocked, round trip Mentor setup → Slots → Mentor setup.
- **Records:** `revision-002/fix-001-stripe-status.md` (separate note), evidence in `revision-002/evidence/fix-001-stripe-status/` (before/after logs, screenshots, the script), `prototype.json` manifest: new `index.html` sha256 plus the new files; all manifest hashes verified. The historical persona report, `README.md` and the historical `browser-walk.log` were not edited.
- **`lekcja-07/POSTEP.md`** rewritten: current status per exercise, limits kept (real-person test skipped, persona findings `[SYNTHETIC]`), historical results labelled as historical, new checks labelled separately; exercise 1 section kept.

## Decisions

- Fix by removing the stale notice rather than rewording it: the banner describes a past state and has no meaning once the check answers. Failure to start Stripe and "Leave before finishing" paths are unaffected.
- Manifest hash of `index.html` updated (the manifest tracks every file); recorded in the fix note.
- Did not rerun the five historical `agent-browser` walks (script not in the repo; no assertion in the log refers to this notice).

## Checks (local, 2026-10-27)

- `npm run lint`: pass. `npm run typecheck`: pass.
- `npm run test:coverage`: pass, 100% statements/branches/functions/lines (76 files).
- `prototypes/konta-i-role` `npx vitest run`: 82 tests pass.
- `npm run build`: compiles and generates pages, then exits 1 with `SecurityFatalError: Your version of Next.js is affected by a known security vulnerability` (Next.js 16.4.0). No package code was changed in this run. CI's Build job on `d38fcd4` passes, so this appears specific to the local Next.js run; not investigated further and no Next.js upgrade was made.
- `npm run test:integration`: **not run**, Docker is not available in this environment. CI's integration job passed on the pushed head `d38fcd4`, which does not include these uncommitted changes.

## Outcome

Partial/success: fix and docs done and verified locally; local build gate and integration gate not green/not run as above; CI status refers to the pushed head only.

## Addendum (same day): status table and build discrepancy

- `prototypes/konta-i-role/POSTEP.md`: status table unified with the documented stage descriptions (stage 2 and 3 done; duplicate/stale rows removed; history note added; limitations and open gaps untouched). `lekcja-07/POSTEP.md` sentence about the inconsistency updated.
- **Build discrepancy, explained from source (`node_modules/next/dist/lib/upgrade/nudge.js`, `build/index.js`, `telemetry/agent-name.js`):** same Next.js 16.4.0 locally and in CI (lockfile). Next 16.4.0 defaults `experimental.agentUpgrade: 'security'`; `next build` runs `nudgeUpgrade`. With an agent detected (here `CLAUDECODE`) it fetches npm advisories and, for an affected version, throws `SecurityFatalError` (exit 1) once; a retry within 5 minutes is allowed. In CI no agent is detected and there is no TTY prompt, so it returns before any advisory lookup. Command and Node version are identical (`npm run build`, Node 22.23.3). No project config, env var or workflow sets or disables the policy.
- The underlying signal is real: `npm audit --omit=dev` reports next `16.0.0 - 16.4.0` critical (RCE in image optimization with SVG, DoS with Server Actions, RCE in `use cache` typed arrays); a fix is available. CI passing hides it.
- Not done by request: no dependency update, no check disabled, no retry/bypass run (build was not re-run with the agent variable unset). Lesson added to `.ai/lessons.md`.
