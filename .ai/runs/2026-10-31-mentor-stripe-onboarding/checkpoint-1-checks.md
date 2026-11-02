# Checkpoint 1 — Stripe foundation
> Acceptance-scope update (2026-11-01): historical US/PL wording below is superseded. Phase 2 acceptance requires automated integration tests using the fake Stripe gateway. Real Stripe onboarding has not been validated for US or Poland; validate both separately before production release. Supported countries, Connect Express architecture and implementation are unchanged.


Steps: 2.1, 2.2, 2.2-review-fix, 2.3, 2.4 and 2.4-review-fix; commits 09b119d through 4530f79. Scope: configuration documentation, Stripe adapter and test double, threat model, payout schema and signature-only webhook handler. The code is not connected to application routes or a service yet.

- `npm run lint`: passed after removing test warnings.
- `npm run typecheck`: passed across workspaces and repository tests.
- Focused tests: 7 files, 56 tests passed; webhook follow-up: 6 passed.
- Focused coverage: Stripe adapter, mock and webhook handler each reached 100% statements, branches, functions and lines.
- `npm run build`: passed.
- Disposable PostgreSQL: executor reports migration up/down/up and constraint checks passed; container removed.
- UI verification: not applicable; no UI changed in this checkpoint.
- Full coverage, the final-head fake-gateway integration suite, and formal independent review remain outstanding. Real Stripe integration is not validated and is a separate pre-production requirement for US and Poland.
