# Walkthrough: Future state, booking and session (1.0), decided steps, product-brief.md, 2026-10-16

One run supports no finding. The most consequential item seen once: both personas hit the two-hour booking floor against a success condition of "within the hour" — the urgent seat would book only if the slot lands before the release, the other would leave. The real check is a mentee interview about the last urgent block (below). Everything here is synthetic and does not satisfy the Definition of Ready.

Stance: adversary (brief mode `own`; also chosen in the command)
Panel: 1 run × 2 personas; run 1: P01, P02
Basis: product-brief.md (Product, Target group, Problems, Key flows, Business rules, Scope, Non-goals, Glossary; assumptions A02 and A04 shaped the questions only). Evidence tiers: two `[INTERVIEW]` notes, six `[DOCUMENT]` decision records (D07, D09, D21, D22, D27, N01). Held-out `[INTERVIEW]` note used only in the parity check.
Panel snapshot: personas.md in this session directory
Session: .ai/specs/research/walkthroughs/2026-10-16-future-state-booking-and-session-1-0-decided-steps-session-001/ · subject .ai/specs/product-brief.md · flow "Future state, booking and session (1.0), decided steps"
Composition: assumed — the material gives no segment proportions; one seat per segment, one of them (P02) a person for whom the problem barely matters, sourced from the platform-dev note.
Saturation: not reached — in run 1 the second interview raised 6 of 18 topics (about one in three) that the first had not, so more runs would still add something. Topic wording was normalised once by the interviewer, so the count is approximate.
Parity: 8 of 9 held-out themes (one only in part), against 1 held-out note; see section below and `calibration.md`
Elapsed: persona runs about 1 minute wall clock (both in parallel); consolidation and parity not timed
Not askable of this panel: none — A02 and A04 are both askable of mentees.
Homogeneity flag: each segment rests on one note, so each seat is that note's situation; the panel cannot show variation within a segment, which is itself a finding about the material.

## 🎯 Scope and limits

Narrative walk of the five decided steps on paper; no screen, prototype, or app was observed, and no browser was used. Each persona was one fresh-context subagent answering the questions and the five pressures in a single pass, not turn by turn, so a later answer may be coloured by an earlier one; only the step-4 variation changes one factor at a time. Payments, cancellation, mentor onboarding, payouts, and the post-session note are outside the brief's slice and were not walked. Two interviewer-applied pressures (price visible only at the final confirm; slot time revealed only after signup) are not claims in the brief, so reactions to them describe the pressure, not a defect in steps 3 or 4.

## 🔍 Barriers that repeated

None. With one run nothing can have repeated across runs. Items below are *Seen once*.

## 📋 Missing cases that repeated

None (single run); see *Seen once*.

## ⚠️ Contradictions with the brief

None reported (single run); see *Seen once*.

## 🔍 Outliers

P02 (run 1) decided at step 3 to leave and, when the deadline was removed at step 4, would not book at all and would do it alone. The reason in the persona's lines is that nothing is on fire and an internal channel always has someone; the pressure that flipped it was the unstated price combined with an unknown reimbursement path. This is the seat for whom the problem barely matters, so leaving is the expected case rather than a misread, but it is the case an averaged panel would hide: the brief says nothing about who the flow is for when there is no urgency. [SYNTHETIC]

## 🔁 Seen once, not reported as a finding

All are `[SYNTHETIC]`, run 1.

1. **Two-hour floor against "within the hour"** (step 4; R03, D22; attacks A04). P01 and P02. P01: "I signed up without knowing" (intense), books only if the slot precedes the release, otherwise returns to Stack Overflow, Discord, workaround and TODO. P02: the floor already misses an under-an-hour condition; with no deadline would not book. D22 itself says "within the hour" is not promised, so this is the known gap, not a surprise.
2. **No fit signal when finding a mentor** (step 2; D21; attacks A02). P01 and P02. The list is ordered by recent availability; both said it says nothing about whether a mentor can do their task, and both said they judge by visible past work or a vouch, which the brief does not describe on the list. P01 "would pick on gut feel in five minutes" and called it a gamble.
3. **Login before seeing anything** (step 1; D07). P01 and P02, mild to moderate irritation, both continued with GitHub. The brief does not say whether the list or a profile link is visible before sign-in: a missing case in the document.
4. **Price and who pays are unknown** (step 3; R02, D09; attacks A02). P01 and P02. For P02 the unknown reimbursement path decided the walk; P01 hesitated but continued. The brief states no price, so what a mentee sees here cannot be tested on paper.
5. **What can be shared in the text session** (step 5; R04, D27). P01 asked for code paste and what the mentor sees; P02 would not paste company code into an outside screen without knowing the rules (no passage behind it; panel-only). The brief describes the session screen only as a text consultation.
6. **P01's reason not to switch** (adversary line): a prior paid course was generic and outdated, so paid help is expected to be generic again; it is sourced to the interview and matches A02's risk, but it is one seat.

## 🧪 To confirm with real users

All rows are for Seen-once items; none is a finding.

| # | Hypothesis | Persona ids / runs | Settles | Who to recruit | How |
|---|---|---|---|---|---|
| 1 | A mentee in an urgent block would book only if the earliest slot precedes their deadline; an under-an-hour need is not met by the two-hour floor. | P01, P02 / run 1 | A04, R03, D22 | Developers who were blocked before a release in the last three months | Ask for the last time: when help had to arrive, what happened to help that arrived late; later, read the booking-to-start measure D22 defines |
| 2 | Without a fit signal on the list, mentees choose on gut feel or leave. | P01, P02 / run 1 | A02, D21 | Same developers, plus some who never paid for help | Show the list as described and ask what they look at to judge a stranger, with a task to find a fit in five minutes |
| 3 | Requiring login before any mentor is visible costs urgent mentees at the first step. | P01, P02 / run 1 | D07; open question whether list/profile is visible before login | Developers in a recent urgent block | Ask the last time they created an account for urgent help and when they gave up; ask the team whether the list is visible before login |
| 4 | Not knowing price and who pays ends the walk for a company-reimbursed buyer. | P02 / run 1; P01 hesitated | A02, R02, D09 | Developers at larger companies; those who paid out of pocket | Ask who paid for help last time and how that was approved; a data request on expense routes at a larger company |
| 5 | Mentees are unsure what they may paste into the session screen. | P01, P02 / run 1 | R04, D27 | Developers who ask for outside help with company code | Ask what they pasted last time and what company rules applied |
| 6 | Where there is no urgency and an internal channel exists, the offer does not apply. | P02 / run 1 | A02 | Platform developers at large companies | Ask for the last time they solved something alone and what would have made them pay; ask how large this group is (data request) |

## 📝 Interviews

Transcripts: transcripts/run-1-P01.md, transcripts/run-1-P02.md. Acquiescence: of the answered yes/no questions across the panel, 2 of 5 were yes (no-basis answers, 2 of 8, reported separately as the material's gaps); no clear yes-skew. Biases checked: over-positivity absent (one persona leaves, one conditions on a slot); the same tool proposed by everyone absent; both personas are developers in a one-off block, so "same kind of person" is present and the engagement differs by design (central vs barely); idealism not seen.

## 🔍 Parity with real interviews

Held-out note: holdout/2026-09-01-interview-backend-dev-fintech.md. Not used for any persona and not passed to any subagent. The main agent read it in step 1 before composing pressures; the "about five minutes" pressure traces to the platform-dev note.

- **In both:** an urgent block before a release with no help on hand; internal help absent or an outside answer unreliable; an answer needed within about an hour or less; an account-creation wall aborting the attempt; price a shrug and who pays unresolved; text preferred; trust from visible past work rather than a title; no use for saved answers or a subscription. Sentiment aligned (impatience, abort-when-slow). The panel stayed generic where the real person was specific: the real note names an exact prior task as proof of competence and says ratings are worthless; the panel said only "visible work or a vouch".
- **Real-only (material to gather):** a previous paid marketplace attempt that was slow to find someone and ended with a failed call; the social cost of a slipped release; a named-task credential. Persona lines for P01 or a new seat need this material.
- **Panel-only (questions for the next real interview, not findings):** whether sign-in before browsing is itself the barrier; reimbursement route; whether anyone would pay when there is no deadline; what they may paste of company code (the real interviewer flagged this unasked); code-paste support in the session.
- The overlap is high partly because the source notes already say similar things; treat it as a trend point only. It is not a reason to skip real interviews.

## 📸 Evidence

Narrative walk; no screens exist and none are described.
