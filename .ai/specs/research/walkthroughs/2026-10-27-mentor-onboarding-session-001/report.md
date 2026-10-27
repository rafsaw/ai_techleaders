# Walkthrough: mentor onboarding, prototype revision-002, 2026-10-27

The most consequential repeated hypothesis: a mentor who is asked for identity and payout details before any booking exists would stop at the Stripe step (all four personas, both runs), and the unlock condition the two wary personas name, a real booking first, cannot happen before onboarding (a known person's promise, a pressure posed by the interviewer, unlocks only the other seat). Real check next: watch 5 to 6 invited mentors from the 50-name list do the Stripe step with a clickable build and ask what they would need to see first. Every finding below is synthetic and does not satisfy the Definition of Ready. Basis is interviews only (two mentor notes), so the panel is thin.

Stance: validate (brief mode is `own`, which defaults to `adversary`; the user chose `validate` explicitly, so agreement was not discarded and the report treats friction on real screens as hypotheses)
Panel: 2 runs × 2 personas; run 1: P01, P02; run 2: P03, P04
Basis: `.ai/specs/product-brief.md` (Scope, Key flows, Business rules, Non-goals, Glossary; Target group for segments); `[INTERVIEW]` `2026-08-22-interview-mentor.md`, `2026-09-03-interview-senior-python-meetups.md`; `[DOCUMENT]` prototype README. No `[DATA]`, `[PRODUCT]` or `[BENCHMARK]` line carries a persona line.
Panel snapshot: `personas.md` (this session)
Session: `.ai/specs/research/walkthroughs/2026-10-27-mentor-onboarding-session-001/`; subject `.ai/prototypes/discovery/mentor-onboarding/revision-002/index.html`; flow "mentor onboarding" mapped by the user to the brief's Key flow "Future state, a mentor" (the brief has no heading of that name)
Composition: assumed. One segment (mentors), two seats from two different notes; across runs each seat is a fresh instance of the same note differing only in state of mind at entry (itself partly assumed). The panel is therefore two voices heard twice, not four voices; this is a homogeneity flag and a finding about the material.
Saturation: not reached on the three-interview window (seat B's interview raised about 14 topics not raised by P01). Within each seat the second instance added 0 to 1 new topic, so the material per seat is exhausted; the segment is not.
Parity: 4 of 10 scored themes in one held-out note were also raised by the panel (an eleventh was seeded by the interviewer's pressure and is not scored); 6 only in the real note; 8 panel-only. One note, one session. See `../../calibration.md`.
Elapsed: not timed per phase. Browser walk and capture of 21 states by the main agent; the four persona subagents ran in parallel; their durations were not recorded.
Not askable of this panel: A01, A03, A05, A06 (mentee-side), A07 (provenance), A08 (vault, Later). A04 is the only mentor-side assumption, and the interview could only ask a sign-up-friction story (Q6), for which neither seat had a story ("no basis").

## 🎯 Scope and limits

Flow: invitation email → sign-in → accept → mentor setup → profile → Stripe stand-in → slots → ready. Medium: static prototype opened through `agent-browser` (`file://`, one clean session, 1280 px). Role: the prototype's fictitious invited account; the simulated GitHub button was used; no credentials typed.
Deviations from the walk contract: the main agent walked the screens once, in the linear order, with the happy path and the error states, and gave every persona the same observed text states (W1 to W12); personas did not propose next actions that the browser then performed. Personas saw accessible text, not screenshots. Screens the persona would have reached by a different choice (email sign-up, wrong-address invite, invalid link, narrow viewport) were not walked. Persona hours of the day and "one slot" choices are inventions and carry no finding. The "known person books first" pressure was posed as a hypothetical.
Not walked: the public listing, slot picking by a mentee, payment, the session screen, anything the prototype excludes.

## 🔍 Barriers that repeated (worst first, ties marked)

Findings 1 to 6 and 10 all have weight 4 and spread 0; they are tied (10 is listed later only because its reactions are mild). Findings 8 and 9 (weight 3, spread ±1) are not ranked apart from each other, nor from the weight-4 or weight-2 findings (gap 1 is inside the larger spread of 1). Findings 7, 11, 12, 13 and 14 (weight 2, spread 0) rank below the weight-4 findings (gap 2 exceeds the spread). Findings 7, 11, 13 and 14 rest on seat B alone and finding 12 on seat A alone: each is one note heard twice, not two independent voices.

### 1. Identity and payout details are requested before any booking, and the mentor stops there.

[SYNTHETIC]

Weight: 4; spread: ±0; personas: P01, P02 (run 1); P03, P04 (run 2).
Step W8 (`S11`, `S12`, `S13`). Fast reactions: "Identity and payout details, for nothing yet? No." (P01, moderate reluctance); "No" with resistance, no reason to do it before a booking (P03, moderate; the "empty shop" image sits in the decision answer, D2); "STOP… strong" (P02, P04, trigger: details before anybody has booked me). All four chose to leave in the decision simulation (D2). Considered answers rest on the seat passages (seat A: no basis for a sign-up story, a fresh reaction; seat B: "no account number before anybody has booked me"). Touches D05 (accepted by the product owner: "losing a mentor who refuses is accepted") and A04 (not askable beyond this).
Real check: recruit 5 to 6 engineers from the 50-name list with a warm contact in TypeScript, React or Python; show the Stripe step as a clickable prototype; ask what they did the last time a service asked for payout details before they had earned anything, and what they would need to see before continuing. Settles: A04, D05.

### 2. Two statuses disagree on the same screen: "Stripe is checking your details" banner beside "You are bookable. / Payouts confirmed".

[SYNTHETIC]

Weight: 4; spread: ±0; personas: P01, P02 (run 1); P03, P04 (run 2).
Step W10 (`S16`, observed by the main agent in the screenshot, not only reported by personas: the notice "Back from Stripe. Stripe is checking your details." stays above the bookable status). Fast reaction: "Which is it?" (P02); the banner contradicts "Payouts confirmed" (P01, P03); mild irritation in all four, P01 would distrust the page. This is a defect in the prototype that does not depend on the panel; it touches the brief's definition of bookable (D05) and prototype assumption SA6.
Real check: fix before any session with real mentors, then include the Check-status screen in the usability task and ask the mentor to say in their own words whether they are bookable. Settles: SA1, SA6.

### 3. After accepting, the home page gives no next step; "Mentor setup" is a small header link.

[SYNTHETIC]

Weight: 4; spread: ±0; personas: P01, P02 (run 1); P03, P04 (run 2).
Step W4 (`S05`). Fast: "where now?" (P01, mild confusion), "Now what?" (P02, P03), "I'm a mentor now, I didn't agree to much" (P04). Touches L01 (approved screen map: land on `/` with the notice) and SA2 (link placement open).
Real check: first-click test on the post-accept page with 5 mentors; record time to reach Mentor setup. Settles: SA2, L01.

### 4. The invitation does not say what a mentor does, why this person, who else is on it, or what is in it for them.

[SYNTHETIC]

Weight: 4; spread: ±0; personas: P01, P02, P03, P04 (both runs).
Step W1 (`S01`). Fast: "fine, plain, neutral" (P01), "fine, not pushy" (P02), "fine, I'll click" (P03), "fine; mild curiosity at best" (P04). Considered friction in all four: nothing about what the role involves, what stays after a session, who else is on it, or money. P02 asks first "is this a sales thing?". The email is the operator's manual artefact (D14), so its text is open.
Real check: show the invitation text to 5 to 6 engineers on the warm-contact list; ask what they believed the email was asking and what they would reply. Settles: A04, Q13 (operator wording).

### 5. The 20% commission is marked "provisional" and mentors have no guidance for setting two prices.

[SYNTHETIC]

Weight: 4; spread: ±0; personas: P01, P02, P03, P04.
Step W6 (`S07`, `S08`). Fast: wary of 20% on a price set by the mentor (P01), "bothers me, moderate" (P02), will not set prices against a changing number (P03), "guessing earnings" (P04). No persona had ever charged (seat passages: "faktury. nie"; never paid), so the finding is about first-time pricing, not about the level of the commission. Touches D06 (commission 20% provisional, review after 20 sessions) and SA4 (price bounds not set by the brief). Both seat notes record that rate was never obtained.
Real check: ask the same 5 to 6 mentors, as a task, to set a price for 25 and 50 minutes with and without a reference range; record the number they choose and what they say they would compare it to. Settles: D06, SA4.

### 6. After "ready", nothing shows how a mentee finds the mentor, what a booking looks like, or when money arrives.

[SYNTHETIC]

Weight: 4; spread: ±0; personas: P01, P02 (run 1); P03, P04 (run 2).
Step W12 (`S20`, `S21`). The footer says the listing, payment and session screen are not simulated, so this is partly the prototype boundary; each persona named at least one of the three points as missing, though not all three (money: P02, P03, P04; how a mentee finds the mentor: P01, P02, P04; what a booking looks like: P02), so the weight counts the shared gap after "ready", not each sub-point. P02 adds "what I'm told about the person so I can see whether it's homework"; the brief closes that: D10 gives no problem preview and no in-product refusal.
Real check: add the mentee-facing preview or a one-page "what happens next" to the next prototype revision and re-walk with real mentors; ask what they expect to happen between "bookable" and the first payout. Settles: D10, A04.

### 7. The GitHub name is shown publicly, and the public page goes live before the mentor can be booked, without the mentor's say.

[SYNTHETIC]

Weight: 2; spread: ±0 (run 1: P02; run 2: P04; both seat B, one note, so one voice twice). P01 was calm about it ("my GitHub is my profile"). P03 reacted ("Hm.", mild wariness) but tied it to the seat's rule "nothing published without the mentee's agreement", which is about mentee consent, not the mentor's own name; that is an extension beyond the passage, so P03's reaction is recorded here and not counted.
Steps W3 (`S04`) and W7 (`S09`, `S10`). Fast: "Public? Nobody asked me." (P02, moderate irritation); "moderate unease" (P04). The notice is carried from the approved E01 map (SA11). Persona material: seat B "name stays on anything published". Touches D13 (profiles public), N02, and the persona never-lines.
Real check: ask mentors at the invitation step what they expect to be public, and whether they would want to preview or hide the page until they are bookable. Settles: D13, SA8, SA11.

### 8. "Check status" must be clicked to learn whether Stripe has finished.

[SYNTHETIC]

Weight: 3; spread: ±1 (run 1: P01, P02; run 2: P04); P03 saw no friction.
Step W9 (`S14`, `S15`). Reactions are mild ("polling", "having to press"). Prototype simplification SA1; real Stripe flows may send an email. Real check: ask the tech lead (D05 task) what Stripe offers (return URL, webhook), then test whether mentors expect an email. Settles: SA1.

### 9. Slot dates and times are typed by hand, and there is no way to repeat a slot.

[SYNTHETIC]

Weight: 3; spread: ±1 (run 1: P01; run 2: P03, P04); P02 raised only the fixed-time commitment. The sub-points differ: P01 raised only the missing repeat, P04 only the typing, P03 both.
Step W11 (`S17` to `S19`). Mild; the too-soon error was praised. Touches SA7 and D16. Real check: ask 5 mentors, as a task, to publish a week of availability; record the number of slots and where they stop. Settles: SA7, A04.

### 10. "No password reset" pushes the mentor to GitHub sign-in (mild).

[SYNTHETIC]

Weight: 4; spread: ±0 (P01, P02, P03, P04). Nobody stops; three of four chose GitHub, P02 chose email to avoid a public GitHub name. Touches N03, D13. Real check: ask mentors without GitHub (if any) what they would do on losing the password; the interview material records none. Settles: N03.

## 📋 Missing cases that repeated

### 11. The mentor's only unlock condition for Stripe, a real first booking, cannot occur before onboarding.

[SYNTHETIC]

Weight: 2; spread: ±0 (run 1: P02; run 2: P04; both seat B, one note, so one voice twice; both explicit: "they can only book after I do this, so it's circular"). Seat A (P01, P03) said a known person's promise would make them continue; that promise was a pressure the interviewer posed (D2 second half), not a condition the personas named, and its wording echoes a held-out note, so it carries no finding (see Parity). Touches D05. Real check: ask 5 mentors what, short of a booking, would make onboarding feel safe (e.g. a refundable test, seeing the mentee list). Settles: D05, A04.

### 12. Seat A reads the shipped scope as the transactional shape it left Codementor over; nothing in the flow shows what stays after a session.

[SYNTHETIC]

Weight: 2; spread: ±0 (run 1: P01 as a contradiction; run 2: P03 as a missing case). D01 defers the vault by design. Touches D01, A08 (not askable to this panel as a mentee question). Real check: in the mentor interviews, ask what they did with the last answer they wrote after sending it. Settles: A04 (indirectly), the Later scope.

### 13. Mentors do not know who else is listed, and fear being listed beside strangers.

[SYNTHETIC]

Weight: 2; spread: ±0 (run 1: P02; run 2: P04; both seat B, one note, so one voice twice). The prototype shows no list. Touches D04. Real check: ask 5 to 6 mentors whether and how they would want a listing shown to them before accepting. Settles: D04, A04.

### 14. Nothing states how long mentor setup takes.

[SYNTHETIC]

Weight: 2; spread: ±0 (run 1: P02; run 2: P04; both seat B, one note, so one voice twice). Steps W4 and W5 (`S05`, `S06`). Both missed a time estimate; the seat's own limit is twenty minutes of setup (cited passage). Seat A did not raise it. Promoted from *Seen once* because it appeared in both runs. Real check: time the real setup with 5 to 6 mentors from the warm-contact list and ask when they would have stopped. Settles: A04.

## ⚠️ Contradictions with the brief

None repeated beyond those placed above under the finding they belong to: findings 1 (D05), 7 (D13/N02 perimeter) and 12 (D01) carry the brief claim. The persona material contradicts no brief claim by itself; the conflicts are between what a mentor says they will not accept and what D05 and D13 prescribe.

## 🔍 Outliers

P01 (run 1) accepted the public-name notice as harmless and is the only persona who would proceed through W3 without a pause; seat B (P02, P04) both refuse to be unlocked by a known person's promise while seat A (P01, P03) is unlocked by it; since the promise was posed by the interviewer and echoes a held-out note, this difference is an artefact to check, not a persona finding. What the real interviews should settle first is what, short of a booking, would make the Stripe step feel safe. P02 alone would choose email sign-in to avoid a public GitHub name (seen once).

## 🔁 Seen once, not reported as a finding

- "Not bookable yet" reads like a mark against me (P02, run 1).
- The public work link is text, not clickable (P01, run 1; prototype artefact).
- A slot reserves 50 minutes though a mentee may take 25 (P02, run 1 only): a prototype rule (SA7), mild.

## 🧪 To confirm with real users

| # | Hypothesis | Persona ids / runs | Settles | Who to recruit | How |
|---|---|---|---|---|---|
| 1 | Mentors stop at identity and payout details before a booking | P01, P02 / 1; P03, P04 / 2 | A04, D05 | 5 to 6 engineers from the warm-contact list (TS/React/Python) | Clickable Stripe step; ask for the last time a service asked for payout details before earning |
| 2 | A stale status banner makes the mentor distrust "bookable" | all | SA1, SA6 | same group | Fix, then task: "are you bookable?" in your own words |
| 3 | No next step on the post-accept home page | all | SA2, L01 | same | First-click test; time to Mentor setup |
| 4 | The invitation text does not say what the role is or what comes after | all | A04, Q13 | same | Show the email; ask what they think it asks and what they reply |
| 5 | Provisional commission and no pricing guidance stall first-time pricing | all | D06, SA4 | same | Price-setting task with and without a range; record the numbers |
| 6 | Mentors expect to see how mentees find them, a booking, and the first payout | all | D10, A04 | same | Add a "what happens next" view; re-walk |
| 7 | Mentors may object to the GitHub name and the page being public before they can be booked | P02 / 1; P04 / 2 | D13, SA8, SA11 | same | Ask at the invitation step what they expect to be public |
| 8 | Mentors expect Stripe completion to arrive without clicking | P01, P02 / 1; P04 / 2 | SA1 | tech lead plus 5 mentors | Check Stripe return/webhook; ask about email |
| 9 | Typed slot entry with no repeat slows publishing | P01 / 1; P03, P04 / 2 | SA7, A04 | same | Publish-a-week task |
| 10 | No password reset nudges to GitHub | all | N03 | mentors without GitHub, if any | Ask what they do on a lost password |
| 11 | A real first booking cannot unlock onboarding; another reassurance may be needed | P02 / 1; P04 / 2 | D05, A04 | same | Ask what, short of a booking, would make onboarding feel safe |
| 12 | Mentors who value notes see the first build as transactional | P01 / 1; P03 / 2 | D01, Later scope | mentors who keep notes | Ask what they did with the last answer after sending it |
| 13 | Mentors fear being listed beside strangers | P02 / 1; P04 / 2 | D04, A04 | same | Ask how they would want a listing shown to them |
| 14 | Missing setup-time estimate may stall mentors with a twenty-minute limit | P02 / 1; P04 / 2 | A04 | same | Time the real setup; ask when they would have stopped |

## 📝 Interviews

Transcripts: `transcripts/run-1-P01.md`, `run-1-P02.md`, `run-2-P03.md`, `run-2-P04.md`. Acquiescence measured on the four balanced past-behaviour questions: 8 yes of 10 answered (Y1 and Y2 yes for all four, both questions grounded in the persona passages; Y3 answered "no" by P02 and P04; Y4 "no basis" by all four, plus Y3 "no basis" by P01, P03); 6 no-basis answers are reported as gaps in the material. A yes share above one half was expected here because the passages support yes on Y1 and Y2, and no unsupported yes was found, so no answer was excluded as acquiescence. Interview flags: the pressured choices in D2 and D3 were recorded with the story-versus-choice line for P01, P02 and P03 but for P04 only in D1, and walk steps do not uniformly list three things noticed or a feeling (personas saw text states, not screenshots). Interview flags: P01's and P03's walk lines about "notes" are the persona's own passage speaking, not a bystander relay; hours of the day in D3 were inventions and are dropped. No stated-preference question was asked.
Panel biases checked: over-positivity not present (every persona raised friction at several steps); "GitHub" was chosen by three of four, but the prototype offers it as the primary option, so it is not a persona-proposed tool; every persona comes from the founders' reach and from two notes (flagged); the seats were not equally engaged (seat B barely cares by construction, which showed in D1 and D3). Idealism and over-negativity: all four personas refused the Stripe step with strong or moderate words while the seat passages hold no sign-up story (Q6 "no basis" for all four, one persona calling its answer a fresh reaction), so the unanimity at finding 1 may be model dramatisation of a refusal the material only supports for seat B ("no account number before a first booking"); the real check for finding 1 matters most for that reason.

## 🔍 Parity with real interviews

Held out: `2026-09-03-interview-staff-engineer-declined-before.md`. The main agent read it while composing the panel; no persona or persona block received it or anything derived from it, so the comparison stands but the leak is recorded.
Themes in the real note (11): no relationship, just answer the question; text is fine between meetings; 25 minutes is fair; a high price as a filter; does not need money, needs not to lose time; found through their own link, not listed beside strangers; no ratings; a short note after a session, only with the mentee's consent, with their name and a way to take it down; "I'd forget it exists" if nobody books in a month; would publish availability once they see who else is there and the first booking is from someone they know; wants to see AI-from-notes before it ships.
Leak found at the quality gate: the "known person books first" pressure in decisions D2 and D3 was written by the main agent after reading this held-out note, so the panel's overlap on that theme is seeded, not independent. It is removed from the score. Scored themes: 10. Shared with the panel (4): no ratings; not listed beside strangers; publishing only with consent and name; protecting time (fixed slots as commitment). The earlier text marked one of the earlier five as partial without saying which; that mark is dropped. Sentiment aligned on all four, strongest on ratings and on being listed. The three overlaps other than the seeded one trace to non-held-out notes (the 2026-08-22 and Python-speaker notes), but the main agent had read the held-out note while writing the seat backgrounds, so even they are an upper bound.
Not scored (seeded): wanting a first booking from someone known.
Real-only (6), where the panel is blind: price as a filter; aversion to a relationship; a way to take a published note down; a month of silence means lapse; the AI-from-notes preview; no weekend contact. Material needed: the mentor interviews above.
Panel-only (8), questions for the next real interview: identity and payout details before a booking (the held-out note did not ask); the GitHub name made public; the stale banner; the home page with no next step; the provisional commission; typed slot dates; no password reset; how a mentee finds the mentor and when money arrives.
Calibration row appended to `../../calibration.md`.

## 📸 Evidence

`screenshots/` S01 to S21 (invitation email, sign-in, accept, loading, home, setup, profile form and errors, saved, public page not bookable, Stripe start/validation/stand-in, incomplete, checking, bookable with stale banner, slots, too-soon error, slot added, ready, public bookable). Browser: agent-browser 0.35.2, isolated session, `file://` URL, closed after the walk.

## ✅ Quality gate (step 8, scored on the written files, 2026-10-27)

Scores 0 to 2; critical items marked *. Fixes made during this pass: pronouns removed from P02's transcript; paraphrases that were set in quotation marks restored to the transcript wording (findings 1 to 5); finding 6 narrowed (not every persona raised every sub-point); finding 7 demoted from weight 3 to 2 (P03's reaction rested on a mentee-consent rule); finding 11 and the opening paragraph corrected (the known-person unlock was an interviewer pressure); a held-out leak removed from the parity score; setup duration promoted to finding 14 for consistency with findings 11 and 13; the 50-minute remark attributed to P02 only; the "want" wording in the hypotheses table replaced; the unverifiable per-agent timing removed.

| # | Item | Score | Note |
|---|---|---|---|
| 1* | Persona lines tagged and sourced | 2 | Assumed lines tagged `[ASSUMPTION]`, gaps listed under No basis for. |
| 2* | No demographics | 2 | The pronouns in a transcript were removed. The notes' language (Polish transcripts) is a property of the material, not of a persona. |
| 3 | Segment, composition, one persona barely cares | 1 | Composition is declared assumed; the barely-cares salience is an assumed extension. |
| 4 | Panel not homogeneous | 1 | Seats differ in objections and vocabulary, but both are one note heard twice. Flagged. |
| 5* | No stated-preference question | 2 | Re-read all four transcripts; the pressured choices are "what you do", not "would you". |
| 6 | Passages recorded, no relay | 2 | Passage use is recorded per answer; the P03 mentee-consent extension was moved out of the counted evidence. |
| 7 | Decisions simulated under pressure | 1 | One P04 decision lacks the story-versus-choice line. |
| 8 | Walk steps complete | 1 | Not every step lists three things noticed and a feeling; text states, not screenshots (declared). |
| 9* | Findings survive every run, weight and spread | 2 | Counts re-checked against the transcripts; ties restated. |
| 10* | `[SYNTHETIC]`, persona ids, real-user check | 2 | 14 findings, 14 tags, 14 table rows. |
| 11* | No persona numbers as shares or predictions | 2 | Weights are persona counts, stated as such. |
| 12* | No validation language | 2 | One "want" in the table fixed. |
| 13 | Zero-barrier explained, stance honoured | 2 | Not applicable beyond validate; barriers present. |
| 14 | Persona biases checked | 2 | Idealism and over-negativity note added. |
| 15* | Held-out parity honest | 1 | A seeded theme was removed from the score; the main agent's early read of the held-out note remains a recorded limit. |
| 16* | Acquiescence measured | 2 | 8 of 10 answered were yes, all passage-grounded; 6 no-basis reported apart. |
| 17 | Parity ran, calibration written | 2 | Row corrected. |
| 18 | No edit to the brief or specs | 2 | Only session files, `personas.md` and `calibration.md` written. |

No critical item scored 0. Items 3, 4, 7, 8 and 15 stay at 1 because of the thin material and the declared deviations, not because a fix is pending.
