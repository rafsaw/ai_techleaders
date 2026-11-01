# Checkpoint 1 — steps 3.1–3.5

Commits 28b5a47 through 4d67176. Scope: validation, database, service, routes and UI.

- PASS: `npm run typecheck`.
- PASS: `npm run build`.
- PASS: focused Vitest suite, 10 files and 108 tests.
- PASS: migration applied, reverted and reapplied on disposable PostgreSQL (step 3.2).
- UI browser/integration: deferred to step 3.6; no running shared test environment or slot-specific integration fixture was available at checkpoint. No screenshots captured.
- Finding: publishing without a profile returns 404 instead of the specified 409. Fix-forward step 3.5-review-fix is queued before integration.
