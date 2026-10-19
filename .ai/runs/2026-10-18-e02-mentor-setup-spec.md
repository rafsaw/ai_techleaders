# E02 mentor setup spec

- Started: 2026-10-18.
- Request: use `om-spec-writing` to write the specification for epic #29 (E02), its stories #37 (E02-S01), #38 (E02-S02) and #39 (E02-S03), and task #47 (E02-S02-T01). Plan the related stories together, split them into phases, share one research pass, and describe the stories' user flows rather than CRUD screens.
- Scope: documentation only. Created `.ai/specs/2026-10-18-mentor-setup.md` and `.ai/data-model/2026-10-18-mentor-setup.html`. Changed only the status lines and pointers of P5, P13, P14 and P17 in `.ai/specs/2026-10-17-platform-primitives.md`. This log records the work.
- Constraints from the PO: no commit and no PR (the PO commits after review); the product brief and tracker are unchanged.

## What was done

1. **Context.** Read the issues, the product brief (D03–D06, D12, D16, R01, N01–N02, A04), the E01 accounts and platform specs, the baseline code (`makeCrudRoute`, `CrudForm`, entities, container), `BACKWARD_COMPATIBILITY.md`, the engineering-standards naming table, the decision records and the relevant mentor interviews.
2. **Skeleton and gate.** Wrote the skeleton with the Open Questions gate (Q0–Q6). Q7 (D05 strictness) was added after the Stripe research. Two research subagents ran in the background while the gate was open: Stripe Connect for #47, and schedulers and mentor platforms. Their findings went into the spec only after the PO answered.
3. **PO answers (2026-10-18).**
   - Q0: one spec. Final contracts for P5, P13 (onboarding half), P14 and P17 live in this spec. The catalog changes only their status and pointers, in the same PR.
   - Q1 a: a slot is a start time that reserves 50 minutes, and the mentee picks 25 or 50. The reading of #39 AC 1 is recorded as a PO decision in Risks.
   - Q2 c: the platform Stripe account is in the **United States** and every price is in **USD**, with no per-mentor currency. The Stripe findings were re-checked for a US platform.
   - Q3 a: one area per mentor.
   - Q4 a: the direct link is public before the mentor is bookable.
   - Q5 a: the public URL is `/mentors/<id>`.
   - Q6 a: times are stored in UTC and shown in each viewer's browser time zone.
   - Q7 a: D05 stays strict.
   - The proposed defaults and the Stripe findings were accepted.
4. **Research.**
   - Schedulers and mentor platforms: Cal.com (code read), Calendly, Easy!Appointments, Topmate, MentorCruise, Codementor.
   - Stripe Connect docs for #47, first for an EU platform and then re-checked for a US platform:
     - Express-style controller properties, `transfers` only, the `full` service agreement for everyone, and hosted Account Links.
     - The bookable predicate.
     - Self-serve payouts only to the US, UK, EEA, Canada and Switzerland.
     - Inputs for E04 on fees and refunds.
5. **Design.** Wrote decisions MD1–MD11, the four flows (first setup, profile, Stripe round trip, slots), the data model with its Mermaid diagram and interactive HTML, the API contracts, the final P5, P13, P14 and P17 contracts, edge cases, risks, phasing and the step-level implementation plan.
6. **Review.** A fresh-context subagent reviewed the spec adversarially. It found 2 High, 3 Medium and 4 Low issues. Fixes applied:
   - **Stripe start flow.** It relied on idempotency behavior Stripe does not have: Stripe returns `idempotency_key_in_use` for an in-flight duplicate. The database row is now inserted first. Stripe is called with a key derived from that row and the stored parameters, and the in-use error maps to 409. The Stripe stub must behave like Stripe.
   - **P14.** The webhook contract had lost the single transaction for the event row and its effect. It is restored, with a `prepare` step outside the transaction for external calls, which gives E04 the "no second booking" guarantee.
   - **Stale status.** Status writes are now conditional on `status_synced_at`.
   - **Overlap error.** The 409 no longer needs an envelope field.
   - **Refresh and ready.** The start and refresh rules now match, and a `ready` mentor can review their details on Stripe.
   - **Smaller fixes.** Status-line copy for phases that ship before Stripe; the E04 money material condensed into one list of inputs; the `formatMoney` options corrected; shadcn `alert-dialog` used for confirmation; the noisy sections trimmed.
   - **Declined.** Dropping P5 and leaving P14 provisional. Both contradict the PO's Q0 instruction.

## Outcome

- **The spec.** `.ai/specs/2026-10-18-mentor-setup.md`, status "draft for review". It has three phases: #37 profile; #47 + #38 Stripe onboarding; #39 slots. Phases 2 and 3 can ship in either order after Phase 1, and all need E01 Phase 3 first.
- **#47.** The spec's Research section is #47's write-up. The D05 impact was presented to the PO: D05 holds; the onboarding country limit is new; the release conditions are platform liability acknowledgement and US tax advice.
- **Items for the brief refresh (#49), owned by the PO:** US platform and USD (MD2), the reading of #39 AC 1 (MD1), and the onboarding country limit.

## Verification

- `git diff --check` passed, with the new files temporarily marked intent-to-add; the index was restored afterwards.
- Relative spec links resolve, code fences are balanced, and the data-model HTML graph JSON parses.
- `npm run lint`, `npm run typecheck`, `npm run build` and `npm run test:coverage` passed.
- `npm run test:integration` passed (Docker available).
- These checks cover the existing application baseline. No application code, schema or tests were changed.
- Files are left uncommitted for PO review.
