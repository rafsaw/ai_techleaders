# 2026-10-28 — E01 Phase 2 manual-test fix: double click on Create account (M1)

## Ask

Phase 2 manual test: a quick double click on **Create account** for
`natalia.testowa@example.com` delivered two confirmation emails with different
tokens. Investigate frontend and backend against the E01 spec, reproduce with a
failing regression test, and (after review, approved) fix it in the frontend
only: keep `SchemaForm` locked after a successful submit while it navigates
away, keep `CrudForm` unchanged, unlock after failures, and make sure a failed
or unfinished navigation does not leave the form stuck. Add an integration test
(double click → one email whose link works). Stay in Phase 2.

## Root cause

- Evidence from the manual run: user row created 20:30:28.009, email 1 at .079,
  user row updated and new link stored at .295–.296, email 2 at .304. The
  second request started its transaction about one password hash (~200 ms)
  after the first answered, so it was sent right after the answer, not
  concurrently.
- `useSchemaForm` released its in-flight ref and `isSubmitting` as soon as the
  answer arrived, before `onSuccess`. `SchemaForm` keeps the values after
  success (`resetOnSuccess={false}`), and `router.push` to
  `/sign-up/check-email` takes a server round trip. In that window the button
  was enabled with valid values, so the second click submitted again.
- Backend behaved per spec: the second request is a valid re-registration of
  an unconfirmed address ("the last registration wins"), which deletes the
  first link (it then reads "isn't valid") and sends a new one; it also spends a
  second unit of rule 4. A truly concurrent pair is decided by the unique email
  constraint and the retry. No backend change.

## What changed

- `packages/ui/src/forms/useSchemaForm.ts`: new option `lockAfterSuccess`
  (default `false`). When set, a successful submit keeps the in-flight ref and
  the pending state until unmount. It unlocks on `pageshow` with `persisted`
  (Back restores the page from the back/forward cache) or after
  `SUCCESS_LOCK_TIMEOUT_MS` (10 s, navigation failed or never completed). The
  timer and listener are dropped on unmount. Failures unlock as before.
- `packages/ui/src/frontend/forms/SchemaForm.tsx`: always passes
  `lockAfterSuccess` (all three public forms — sign-in, sign-up, confirm —
  navigate on success). `CrudForm` is untouched and keeps the default.
- Tests: `useSchemaForm.test.tsx` (`lockAfterSuccess` block: late second submit
  ignored and pending label kept; failure unlocks; timeout unlocks at exactly
  10 s; `pageshow` persisted unlocks, non-persisted does not, second restore is
  a no-op; unmount clears the timer and listener; default unlocks right after
  success). New integration scenario
  `packages/app/tests/integration/password-double-submit.test.ts`: a
  `MutationObserver` clicks again as soon as the button is re-enabled on
  `/sign-up`, plus a real `dblclick`; asserts no late click happened, exactly one
  Mailpit message and one token row, and that its link confirms the address.
- Docs: platform spec F2 behavior, E01 implementation note, `AGENTS.md` (form
  core; integration session-name length), `schema-form.mdx`, `track.md` (M1),
  lesson in `.ai/lessons.md`.

## Verification

- Before the fix: the unit regression test failed (`onSubmit` called 2 times),
  and the integration scenario failed (`window.__lateClicks` was 1, i.e. the
  button was enabled again on `/sign-up` after success).
- After the fix: both pass (see Gate).

## Gate

Final run on the committed tree (all PASS):

- `npm run lint`: 0 errors, 1 pre-existing warning (`.agents/skills/om-share-this-session/…`)
- `npm run typecheck`: pass (a first gate run caught an untyped `vi.fn()` in the new
  unit tests; fixed with `vi.fn<Submit>()` before the final run)
- `npm run test:coverage`: 88 files, 1708 tests, 100% statements/branches/functions/lines
- `npm run build`: pass
- `npm run test:integration`: 7 files, 55 tests (new `password-double-submit.test.ts` passes)
- `npm run test:storybook`: 56 files, 340 tests
- No schema change, so no migration.

## Notes

- First integration attempt failed for an unrelated reason: the session
  suffix `-double-submit` made agent-browser's socket path 106 bytes (max 103).
  Renamed to `-dbl`; recorded in `AGENTS.md`.
- Outcome: success. Phase 3 not started.
