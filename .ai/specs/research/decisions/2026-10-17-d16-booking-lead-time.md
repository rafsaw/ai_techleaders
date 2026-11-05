# D16 — Booking lead time

- Date, owner: 2026-10-17, product owner (founder A); confirmed in the interactive om-discover refresh and approved for saving after preview.
- Origin: PO choice adopted from the course reference backlog as reported by the PO: full-backlog.md E01-S01, E01-S02, E01-S03, E02-S01, E03-S02, E03-S04; course authors’ decisions D07, D08 and D22. The reference file was not available locally and was not independently inspected. Course decision ids are not this project’s decision ids. This records a product choice, not new user research or evidence of demand.
- Decision (current, PO clarification 2026-11-04): A slot is eligible for booking only when its scheduled start is at least two hours after the current server time. Recheck this rule on public display, selection/review, post-auth return, checkout/resume and paid booking claim; a prior selection never freezes eligibility. The product does not promise a quick start.
- Clarifications (original interpretation, superseded by the PO clarification below): The two-hour minimum was measured from slot selection, not payment confirmation. It excludes the twenty-minute or within-the-hour help described in some interviews. A03 remains untested; payment-to-start waiting time is distinct from selection-to-start eligibility.
- Relationship to existing decisions: supplements the brief without changing D01–D12 or R01–R10.
- Review by: unknown. Required path to change: a superseding row approved by the product owner.
- Status: active. Supersedes: the original selection-time interpretation recorded above and clarified below.

## PO clarification — 2026-11-04 (active interpretation)

The previous frozen-at-selection interpretation is superseded and retained here for history. The active rule is `startsAt >= clock.now() + 120 minutes` on public display, selection/review, post-auth return, checkout/resume and paid booking claim. A URL or earlier selection never grants eligibility. If payment succeeded but current D16 fails at claim, persist automatic compensation under [D17](2026-11-04-d17-checkout-holds-and-compensation.md). Slots retain existing whole-minute precision; test +120 minutes included and +119 minutes excluded with a fixed minute-aligned clock. No Selection entity or selection timestamp. This records the approved E04 independent review, not new demand evidence.
