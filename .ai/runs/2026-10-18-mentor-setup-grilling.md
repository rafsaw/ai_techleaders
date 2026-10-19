# Mentor setup specification grilling

- Started: 2026-10-18.
- Branch: `docs/e02-specs`; starting commit: `07d2e9c`.
- Request: grill `.ai/specs/2026-10-18-mentor-setup.md` with the PO, then apply the agreed decisions in one documentation edit. Record the decisions as dated entries in the spec. No commit; the PO commits.
- Scope: documentation only. Covers the E02 spec, the platform-primitives catalog (P13/P14 pointers), the E02 data-model HTML, `.ai/lessons.md` and this run log. No application code, product brief or tracker changes.

## What was done

1. Read the spec, issues #37, #38, #39 and #47, and the platform catalog's P13/P14 sections.
2. Ran three grilling rounds (Q1–Q12) with the PO. Recorded the outcomes in the spec as G1–G12 under "Grilling, 2026-10-18".
3. Rewrote the E02 spec in one pass:
   - four payout statuses
   - a webhook with no inbox, where unknown accounts attach through metadata or answer 500
   - recovery that always lists accounts first
   - a three-way creation-error classification
   - a minimal `webhookHandler`
   - fixed phase order with no *Coming soon* states
   - a lighter manual test-mode run (one US and one PL individual)
   - a trimmed Phase 2 test matrix

   Repeated money-safety and eventual-consistency paragraphs are now stated once, in MD9. The `freshPayout` parameter is removed. `last_reconciled_at` is kept as a diagnostic column.
4. Platform catalog: split P14. E02 builds the `webhookHandler` wrapper; the inbox is provisional and goes to E04. Simplified the P13 status-source bullet, added an "E02 grilling" amendment entry, and updated the phasing table.
5. Data-model HTML: removed the `ProcessedWebhookEvent` node and reduced the payout status list to four values.
6. Added a lesson on simplifying inside PO-instructed decisions.

## Key decisions (PO, 2026-10-18)

- Q1 declined: MD12 stays as written (G1).
- Accepted with changes: Q2 (G2; unresolvable unknown accounts answer 500) and Q4 (G4; keep `last_reconciled_at` and one E04 sentence).
- Accepted as proposed: Q3, Q5–Q10 and Q12 (G3, G5–G10, G12).

## Outcome

- **Success.** The documentation revision is complete and left uncommitted for the PO. E02 is still a spec awaiting review and implementation. The Phase 2 manual Stripe test-mode run is still outstanding.
