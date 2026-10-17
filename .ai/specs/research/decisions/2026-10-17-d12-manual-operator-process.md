# D12 — Manual operator process outside the product

- Date, owner: 2026-10-17, product owner (founder A); confirmed in the interactive om-discover refresh after preview.
- Origin: PO decisions supplied in this session, with a reference to the course backlog `full-backlog.md: R18, E03-S05, E05-S03`. That file was not independently inspected. These are operational choices, not new user research or evidence of demand.
- Decision: In 1.0, cancellation, refunds, no-shows and disputes are handled manually by the operator outside DevMentor. The implementation backlog adds no screens or user stories for these processes. Self-service cancellation and in-product dispute handling are Later. R08–R10 define the operating details, preserving D01–D11 and R05’s no-show settlement outcomes.
- R08: The mentee requests cancellation by email to the operator, using the same channel as R07. The time the operator receives the email determines the 24-hour cutoff in R06.
- R09: The operator uses one shared founders’ email address; choosing the concrete address is a release condition, not a planning blocker. Every resolution is recorded in a shared operator note containing the date, booking, decision and refund amount. Disputes other than no-shows are decided individually; any granted refund is performed manually in Stripe.
- R10: No-show reports must be received within 24 hours after the scheduled session end to follow R05. For a confirmed mentor no-show, “the same day” in R05 means the day the operator confirms the no-show, not the session date. Reports received later are handled individually as disputes. R05’s outcomes remain: a mentor no-show is refunded; a mentee no-show is paid out to the mentor.
- Relationship to existing decisions: supplements D09/D11 and R05–R07; D01–D11 and the wording and settlement outcomes of R05 remain unchanged. The D10 private session screen remains in Now.
- Remaining uncertainty: Q11 remains non-blocking for planning with manual operator handling. Q12 is closed. Q13 retains only the concrete shared founders’ email address, required before release alongside Q05. A01 and the existing evidence limitations remain unchanged.
- PO wording correction: the implementation backlog boundary is “no screens or user stories”. Preserve the distinction between backlog user stories and operational records; the shared operator note remains required by R09.
- Review by: unknown. Required path to change: a superseding row approved by the product owner.
- Status: active. Supersedes: none.
