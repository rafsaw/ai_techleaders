# Fix 001: stale "Stripe is checking" banner (revision-002)

- Date: 2026-10-27. Applies to `index.html` of this revision only. Branch `feat/lesson-07-prototype`, uncommitted at the time of writing.
- Origin: finding 2 of the persona report `.ai/specs/research/walkthroughs/2026-10-27-mentor-onboarding-session-001/report.md`. That report is a historical record and is **not edited**; it still describes the defect as observed in the build it walked.
- Status: the persona findings stay `[SYNTHETIC]` hypotheses. This note records a defect in the prototype that was reproduced independently of the panel. No real-person test was run.

## Defect (reproduced before changing anything)

After "Submit my details" on the Stripe stand-in, Mentor setup shows the notice "Back from Stripe. Stripe is checking your details." The notice was never removed when "Check status" returned an answer, so it stayed above the new status:

- result "Payouts confirmed": "You are bookable." and "Payouts confirmed" appeared under "Stripe is checking your details."
- result "Stripe blocks the account": "Blocked: Stripe cannot enable payouts" and "Not bookable yet" appeared under the same notice.

Evidence: `evidence/fix-001-stripe-status/before-F02-bookable-contradiction.png`, `before-F03-blocked-contradiction.png`, `walk-before.log` (3 assertions fail: A3, A4, B1).

## Change

One statement in `checkStripe()`: when the check returns an answer, the "back" notice (`id: "back"`) is dropped from `ui.notices`, with a comment. Presentation only.

Not changed: D05, the definition of bookable (`bookable()` = profile saved and payouts confirmed), the Ready stage, the order Stripe then Slots, the stepper logic, the simulation state, README, `prototype.json` semantics (only the `index.html` hash and the new files are registered), and every other notice. "Back from Stripe. Setup is not finished yet." (left before finishing) is unaffected and still shown.

## Checks run after the fix (new, not part of the historical 102-assertion walk)

Playwright, Chromium, `file://`, 1280 px; script `evidence/fix-001-stripe-status/walk-fix-001.mjs`, result `walk-after.log`: ALL PASSED (10 checks).

- checking: notice and "Stripe is checking your details." shown, no bookable claim.
- checking → bookable ("Payouts confirmed"): "You are bookable." and "Payouts confirmed" shown, no "checking" text anywhere, no stale status region, stepper shows Stripe completed and Slots current.
- checking → failure (Stripe blocks the account): blocked card and contact action shown, "Not bookable yet", no "checking" text.
- Round trip Mentor setup → Slots → Mentor setup after confirmation: no banner reappears.

Not rerun: the five historical `agent-browser` walks (their script is not in the repository). None of their 102 assertions refers to this notice (searched the log). Only Chromium. Narrow viewport and keyboard behaviour were not re-checked; the change adds no markup.
