# D09 — Accept R04 and R05; in 1.0 refunds and no-show payouts are manual
- Date, owner: 2026-10-15, product owner (founder A); confirmed in the om-discover session.
- Context and the options weighed: R04 (the mentee sees the price before writing anything) comes from one interview (`2026-09-02-interview-freelancer-react.md`). R05 (mentor no-show refunded the same day; mentee no-show paid to the mentor) comes from one interview each (`2026-09-02-interview-freelancer-react.md`, `2026-09-03-interview-senior-python-meetups.md`).
- Decision and why: both rules are accepted. In 1.0 the operator handles refunds and no-show payouts manually in Stripe; there is no automatic no-show detection.
- Consequences, and what would make us revisit it: manual handling does not scale; revisit when volume makes it a cost.
- Status: active
