# Checkpoint 1 — Stripe foundation

> Acceptance-scope update (2026-11-01): historical US/PL wording below is superseded. Phase 2 requires one real US individual test-mode run; Poland is deferred to separate geographic-expansion validation.

Steps: 2.1, 2.2, 2.2-review-fix, 2.3, 2.4 and 2.4-review-fix; commits 09b119d through 4530f79. Scope: configuration documentation, Stripe adapter and test double, threat model, payout schema and signature-only webhook handler. The code is not connected to application routes or a service yet.

- `npm run lint`: passed after removing test warnings.
- `npm run typecheck`: passed across workspaces and repository tests.
- Focused tests: 7 files, 56 tests passed; webhook follow-up: 6 passed.
- Focused coverage: Stripe adapter, mock and webhook handler each reached 100% statements, branches, functions and lines.
- `npm run build`: passed.
- Disposable PostgreSQL: executor reports migration up/down/up and constraint checks passed; container removed.
- UI verification: not applicable; no UI changed in this checkpoint.
- Full coverage, full integration suite, final review, and real Stripe US/PL acceptance remain outstanding.
