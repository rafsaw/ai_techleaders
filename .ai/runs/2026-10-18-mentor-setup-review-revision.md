# Mentor setup specification review revision

- Started: 2026-10-18.
- Branch: `docs/e02-specs`; starting commit: `519322c`.
- Request: apply the joint E02/E01 review recommendations with the PO's explicit overrides for status writes, stable account creation, provisioning/reconciliation, profile length and slot rules; update the data-model HTML and record this run.
- Scope: documentation only: the mentor-setup, platform-primitives and accounts-and-roles specs, the E02 data-model HTML, and this run log. Record the standing correction in `.ai/lessons.md` as required by `AGENTS.md`.
- Constraints from the PO: no commit; the PO commits. Do not change application code, the product brief or the tracker.

## What was done

1. Read the three specs, the existing data-model view, the original E02 run log, repository lessons and the specification-writing guidance.
2. Revised E02 decisions, user flows, payout columns/DTOs, port and inbox contracts, edge cases, risks and implementation tests. Removed timestamp ordering and all upper-slot-horizon validation; retained accepted price/country rules and updated the description minimum.
3. Defined stable account creation and explicit provisioning recovery: local row committed first, safe same-key replay, exhaustive metadata lookup, validated webhook attachment, and retryable failures with no inbox record. In the final design, a complete zero-match listing lets the normal retry create with the same local row and retained idempotency key, after moving the row to `pending` and committing before calling Stripe. No operator command or confirmation is required for zero matches.
4. Applied the E01 amendments in the same change: staged invitation destination, normal cookie renewal without token rotation, mentor navigation, lazy Stripe config, signature-only webhook boundary and canonical E02 primitive pointers. Removed the conflicting historical contracts.
5. Updated the Mermaid architecture/data-model diagrams and the standalone HTML fields, layout and diagnostic-timestamp explanation. Kept `LocalTime` colocated until a second consuming page exists; corrected money examples and overlap-message requirements.
6. Corrected Stripe research policy/limitation claims and added primary links. Confirmed from the account-creation reference that omitting `tos_acceptance` defaults to `full`, avoiding an extra creation parameter. Explicitly separated #47's documentation deliverable from the outstanding Phase 2 real-provider smoke pass.
7. A fresh-context review clarified the action after a failed post-binding fetch and the recovery transition. The final transition follows the PO's correction: complete zero-match lookup → commit `pending` → retry creation with the same row/key. Removed the proposed operator-only recovery path and its command, method, guards and test/documentation requirements. Account attachment also preserves a concurrent successfully reconciled payout snapshot.
8. Added the standing PO correction to `.ai/lessons.md`. No application code, migrations, product brief, tracker, existing run log or git index was changed.

## Key decisions

- The PO's latest instructions replace the earlier proposed revision-column solution. Status is freshly fetched on every synchronization and written without an ordering condition; `last_reconciled_at` is diagnostic only. E04 must fetch again through `syncAccount` immediately before checkout.
- Account creation has no prefill. Stable local IDs in Stripe metadata support recovery and safe attachment to the existing local row.
- Provisioning state is separate from payout readiness. Reconciliation attaches one valid metadata match, permits retry creation after a complete zero-match listing, and fails closed on multiple matches, conflicting IDs or mismatched metadata. A partial or failed listing never counts as zero.
- **PO decision — 2026-10-18 (final correction):** a complete account listing with no Stripe account carrying our metadata lets the retry create automatically. Reuse the same local row and retained idempotency key, move the row to `pending`, and commit before calling Stripe. Zero matches is not an operator case. There is no `payout retry-create` command or `retryCreateAfterReconciliation` method. Multiple matches, conflicting IDs or mismatched metadata are logged with safe IDs and reconciled by hand in the Stripe Dashboard and database under D12.
- Keep USD prices at $5–$1,000, allow descriptions of 1–2,000 trimmed characters, keep the accepted onboarding-country restriction, and retain the 50-minute slot spacing without an upper booking horizon.

## Outcome

- **Success — documentation revision completed.** All three specs, the data-model HTML and the standing lesson reflect the PO's overrides and the remaining review fixes. E02 remains a spec awaiting implementation/review, not an implemented feature. The Phase 2 real Stripe test-mode smoke pass is explicitly outstanding.
- The final recovery design permits automatic creation after a complete zero-match listing with the same row/key and a committed `pending` transition. It adds no payout recovery command.
- Files are left uncommitted and unstaged for PO review; no commit or PR was created.

## Verification

- `git diff --check` passed; modified specs have balanced code fences and resolving relative Markdown links.
- Consistency searches found no remaining old status-ordering field/predicate, upper-slot-horizon constant/bound, or old description minimum in the three specs and HTML.
- The HTML graph JSON and inline JavaScript parse. A jsdom render verified five entity nodes, three relationship edges, focus/reset/zoom behavior, the provisioning/payout enum fields and diagnostic timestamp. No browser/DOM execution errors occurred. USD formatting examples preserve `$40`, `$1.40` and `$0.01`.
- `npm run lint` passed.
- `npm run typecheck` passed across all workspaces and tooling tests.
- `npm run test:coverage` passed: 20 test files, 196 tests, and 100% statements/branches/functions/lines (47 covered files).
- `npm run build` passed with the production build script.
- `npm run test:integration:install` passed (Chrome already installed); Docker was available.
- `npm run test:integration` passed: four production-browser/PostgreSQL integration tests, including fresh migrations and idempotent seeding. Baseline evidence is under `test-results/integration/`.
- Application checks validate the existing baseline only. No E02 implementation, migrations or real Stripe onboarding were executed by this documentation revision; none of those future acceptance checks is claimed as passed.

## PO decision: final recovery correction — 2026-10-18

- The PO corrected the zero-match recovery path: a **complete** account listing with no matching metadata permits the normal retry to create, using the same local row and retained idempotency key. Recheck the binding under the row lock, move it to `pending`, and commit before calling Stripe. A partial or failed listing never counts as zero.
- Removed the added operator-command design, method, confirmation/quiescence procedure, CLI tests and README/AGENTS command notes from E02 and the P12 catalog extension. Multiple matches, conflicting IDs or mismatched metadata still fail closed, log safe IDs and require manual Stripe Dashboard/database reconciliation under D12.
- This PO decision supersedes the proposed operator-only zero-match recovery path. The sections above describe the final state. Lesson: a complete zero-match listing is sufficient for the requested automated recovery; do not add an operator approval step or a new command.
- Kept all other design decisions and existing application/data-model changes intact. Checks for this correction: `git diff --check`, balanced code fences, resolving relative spec links, consistent zero/one/multiple-match outcomes and no removed command/method names in the design files. Runtime code was unchanged; the successful baseline validation recorded above was not repeated. Files remain uncommitted and unstaged.
