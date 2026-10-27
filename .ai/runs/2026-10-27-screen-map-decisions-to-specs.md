# Screen-map decisions and persona questions into specifications

- Request: `lekcja-07/prompty/prompt-decyzje-do-specyfikacji.md` filled for E01: map `lekcja-07/mapa-ekranow.md`,
  prototype remarks "brak" (no `prototype-feedback.md` exists), persona report
  `.ai/specs/research/walkthroughs/2026-10-27-mentor-onboarding-session-001/report.md`.
- Started: 2026-10-27, branch `feat/lesson-07-prototype` at `f7a2a61` (clean worktree).
- Approved specification/plan: change list shown to the PO, revised once after PO questions, approved 2026-10-27.
- Scope: edit only `.ai/specs/2026-10-17-accounts-and-roles.md` and `.ai/specs/2026-10-18-mentor-setup.md`.
  No change to prototype, map, brief, design system or GitHub Issues. No commit.
- Status: specification edits done and approved; documentation-only run, no code, no gates applicable.

## Implementation and decisions

- Accounts spec: header gained the prototype path (`prototypes/konta-i-role/`) and map path.
  New section "Acceptance criteria (screen map)" with SM-AC1–SM-AC14, SM-AC16, SM-AC17, each tagged with
  screen ids and a source label (existing requirement or map decision). SM-AC8 split into 8a (E01 standalone
  lands on `/`) and 8b (existing dependency on E02: `/mentor` and "Mentor setup" link). Subsections: Not adopted,
  Prototype notes (not requirements), Follow-up (map correction for control c03).
- Accounts spec text edits: Flow 1 step 5 (notice follows `returnTo`), SMTP failure wording
  "We couldn't send the email. Please try again later." (Flow 2 and edge table, "offers resend through sign-in" kept),
  invalid confirmation link wording "This link isn't valid. Sign in to continue." (Flow 2 table, Phase 2 step 6).
- Accounts spec end: four `[SYNTHETIC]` questions (findings 3, 4, 7, 10).
- Mentor-setup spec: grey prototype path in header; new final section with the open question from E01
  (acceptance message after redirect to `/mentor`, owner PO), the Stripe stale-banner defect as a separate
  prototype observation (not a persona hypothesis), and seven `[SYNTHETIC]` questions
  (findings 1+11, 5, 6, 7, 8, 9, 14). Findings 12 and 13 stay in the report: no spec covers listing (E03).
- PO decisions of 2026-10-27:
  - AC15 rejected: production emails are not required to carry the expiry date in UTC; map email texts stay prototype-only.
  - AC4 keeps the spec: 429 shows "Too many attempts. Try again later" (no countdown), SMTP failure shows the neutral sentence;
    the c03 contradiction is recorded as a follow-up, map and prototype untouched for now.
  - AC3: "offers resend through sign-in" kept; resend from sign-in unchanged.
  - AC6 wording accepted (wording only, no behavior change).
  - AC8: message-after-`/mentor` stays an open E02 question; prototype limits (O8) described apart from requirements.
  - AC16/AC17: new proposals (link to `/` on `/error`, field retention after technical error) rejected.
  - AC2: how sign-in learns of session expiry is an implementation detail; no new URL parameter.
- Screens with no criterion (reason): s09 and s10 (decision only, out of E01 scope), s13 (decisions only, prototype-only
  mailbox), s14 (tag only, simulated external screen).

## Verification and outcome

- Checked by diff: only the two specification files changed (`git diff --stat`: 2 files). Cross-checked each PO decision
  against the inserted text.
- Not run: lint, typecheck, build, tests, integration (no code or schema touched).
- Outcome: success. Changes left uncommitted for the PO to review and commit.
- Next: PO commits and opens the PR; later correct map control c03 and the prototype; open E02 question remains.
