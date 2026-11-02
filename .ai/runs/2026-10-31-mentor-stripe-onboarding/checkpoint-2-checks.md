# Checkpoint 2 — onboarding flow and Stripe stub
> Acceptance-scope update (2026-11-01): historical US/PL wording below is superseded. Phase 2 acceptance requires automated integration tests using the fake Stripe gateway. Real Stripe onboarding has not been validated for US or Poland; validate both separately before production release. Supported countries, Connect Express architecture and implementation are unchanged.


Steps 2.10, 2.5, 2.11, 2.6, 2.3-review-fix and 2.7; commits 79b4a8c through 086acaf. Includes the onboarding service, routes, setup UI, bookability, migration assertion and local Stripe stub.

- `npm run lint`, `npm run typecheck` and `npm run build`: passed.
- `npm run test:coverage`: 2,011 tests passed, with 100% statements, branches, functions and lines per file (before integration-only changes).
- Payout Storybook: 14 stories passed in each theme, as reported by the UI executor.
- `npm run test:integration -- packages/app/tests/integration/stripe-onboarding.test.ts`: executor reports all 9 scenarios passed against a fresh migrated PostgreSQL database and local Stripe stub, including an 80-second actual SDK timeout, an early webhook binding and forced overlapping requests. A focused race rerun passed; it overwrote JUnit with a partial report, and the full run console output was not saved. Full integration suite remains to be run with a captured log.
- Browser evidence: `checkpoint-2-artifacts/stripe-ready-setup.png`, `stripe-ready-public.png`, `stripe-check-failed.png` (synthetic fixtures).
- Environment deviation: the shared test-env descriptor was used for initial browser exploration and stopped; the executable suite used the repository's own disposable Vitest environment to supply its Stripe stub. It did not reuse the descriptor for the suite as the integration skill specifies.
- The nine fake-gateway integration scenarios passed at this checkpoint and are the Phase 2 acceptance evidence; rerun the full integration suite on the final head. They do not establish real Stripe behavior. Real US and Poland onboarding remain unvalidated and must be validated separately before production release.
