# Accounts and booking brief refresh

- Request: save the approved om-discover refresh with display name in D15; preserve D01–D12 and R01–R10.
- Changes: updated product brief; added D13–D16 decision records, N03 and closed Q14–Q16; updated scope, flows, A02/A03 limitations and readiness. Recorded the PO naming correction in lessons.
- Evidence: PO decisions, not new user research; course references were supplied by the PO and not independently inspected.
- Review: independent skeptical review completed before preview; accepted corrections distinguish selection-to-start eligibility from payment-to-start waiting and include all new scope in the A02 estimate. Final display-name correction checked against approval.
- Verification: protected rows compared byte-for-byte; Coverage recounted as 77 claims (67 sourced, 10 assumed). Two former tagged flow summaries now reference canonical decisions, so five new tagged rows produce a net increase of three. git diff --check, npm run lint, npm run typecheck, npm run build, npm run test:coverage and npm run test:integration passed. Unit tests: 196 passed, 100% coverage; integration tests: 4 passed against ephemeral PostgreSQL. Source links, stable ids and display-name wording verified.
- Outcome: approved documentation saved; no tracker writes, commit or push.
