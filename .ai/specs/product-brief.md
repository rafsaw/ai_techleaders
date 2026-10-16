# DevMentor — product brief

- Date: 2026-10-15
- Mode: own; Owner: product owner (founder A), who also holds the designer role and, by their statement of 2026-10-15, the tech lead role; Pass: full (rounds 1 and 2 of 3 used)
- Evidence basis: seven interviews, each one conversation (four developers seeking help, three engineers who answer questions unpaid, two of the seven conducted by founder B); one Discord export (109 threads, 14 days); one anonymous survey on the same Discord (54 responses, stated intentions); five benchmark pages checked on 2026-09-04; a 50-name mentor list nobody has been contacted from; the founders' own board and workshop decisions. Nobody has paid, booked or agreed to anything in connection with DevMentor (founder A, 2026-10-15); one interviewee did once pay a stranger for help on Codementor, two years ago. The most consequential untested belief is that developers will pay for a written answer from a stranger (A01).
- Coverage: 66 claims — 56 sourced (interview 13, data 9, document 33, product 0, benchmark 1), 0 synthetic, 10 assumed; 1 entry on the collection plan
- Synthetic hypotheses outside Coverage: 0 (no synthetic walkthrough has been run)
- Definition of Ready signed by: the product owner (who is also tech lead), 2026-10-15; ready for: implementation planning of the stated scope (Now), with A01 accepted untested (D01) and A02 to A07 untested
- Sources: `.ai/specs/research/` — interviews `2026-08-20-interview-working-dev.md`, `2026-08-22-interview-mentor.md`, `2026-09-01-interview-backend-dev-fintech.md`, `2026-09-02-interview-freelancer-react.md`, `2026-09-02-interview-platform-dev-solves-alone.md`, `2026-09-03-interview-senior-python-meetups.md`, `2026-09-03-interview-staff-engineer-declined-before.md`; data `2026-09-04-data-request-discord-help.md` with `2026-09-04-discord-help-requests.csv`, `2026-09-04-survey-discord-willingness-to-pay.md`, `2026-09-04-mentor-list-note.md` with `2026-09-04-mentor-list.csv`; benchmarks `2026-09-04-benchmark-*.md` (five); workshop `2026-08-26-workshop-export.md`; board exports `2026-09-02-miro-board-*.md`, `2026-09-04-miro-board-*.md`, `2026-09-05-miro-board-raci-matrix.md`; decisions `decisions/N01`, `N02`, `D01` to `D09`

## Decision summary
The first build is paid text help (D01). A mentor with links to public work offers 25- or 50-minute text sessions, sets the price per format (D06), and becomes bookable only after Stripe onboarding (D05). Mentees find mentors through a public listing filtered by area (TypeScript, React, Python) or a direct profile link (D04), pick a slot and pay when booking (D03). The vault, MCP access and subscriptions are deferred. The product owner chose this, set a provisional target of 10 paid sessions a week for two consecutive weeks by the end of December 2026 (D02), and decided to stop and re-run discovery if it is not reached by 2026-12-31 (D08). The product owner accepts building before the central belief, that developers will pay for a written answer from a stranger, is tested (D01, A01).

The problem is observed in three of four developer accounts (a blocker, nobody to ask in time, a slipped release or lost time); the fourth developer had no unmet need (see Target group). In the Discord export (one community, two weeks), 23 of 109 help threads got no human reply, and 9 of the 31 threads with an urgency signal got none (see Problems). Three of the seven interviews are with engineers who already answer such questions unpaid; they most directly support notes that earn, which is the deferred vault, and only two gave a conditional yes to paid text sessions. Whether anyone pays is not observed: 37 of 54 survey respondents say they would, and 3 ever have.

One trade-off is conscious (D03). Interviewees asked for an answer in about twenty minutes to the same day, and 28% of the Discord threads carried an urgency signal; a booked slot gives no guaranteed earliest start. Whether stuck developers will wait for a slot is untested (A03). The 25-hour build constraint was sized for a scope with a vault answer (A02).

Next: the tech lead estimates Now against the 25 hours (A02) and verifies Stripe's onboarding requirements (D05); then implementation planning. Q05, Q08, Q09 and Q10 stay open and do not block planning.

## Vision

The team's intended direction: mentors earn twice, once for the hour and again every time the knowledge from that hour helps someone else. This is the founders' direction, unchanged by D01, whose first build covers only the first half. `[DOCUMENT]` `2026-09-02-miro-board-vision-target-needs.md`

## Target group and stakeholders

- Customer (pays): developers who pay from their own pocket; 24 of 54 survey respondents said they would pay themselves, 13 said their employer if asked, 6 their employer without asking. `[DATA]` `2026-09-04-survey-discord-willingness-to-pay.md`, question 4
- Customer (pays), interview accounts (price statements are guesses or ceilings): the freelancer said under 200 zł from their own pocket; the fintech developer guessed fifty euros, or one hundred if it really fixes it (the interviewer: "a shrug, not a number"), and ended on "sam bym zapłacił. chyba" (I would pay myself, I think). `[INTERVIEW]` `2026-09-02-interview-freelancer-react.md`, `2026-09-01-interview-backend-dev-fintech.md`
- User (mentee): a working developer or freelancer with a specific blocker and no one to ask in time; the survey sample is 31 employed, 12 freelance, 8 student or between jobs, 3 other. `[DATA]` `2026-09-04-survey-discord-willingness-to-pay.md`, question 7
- User (mentee), not a fit in one account: a platform developer at a 200-person company who solved the problem alone, would pay only for a rare one-off task found in five minutes and expensed, and would not reopen a subscription. `[INTERVIEW]` `2026-09-02-interview-platform-dev-solves-alone.md`
- User (mentor): a senior engineer who already answers the same questions unpaid: one monthly, one weekly, one continuously on Slack. The problem the mentor interviews support most directly is notes that earn without a call (the mentor: "the notes earn something every month without me being on a call"; the Python speaker: the doc "is all the value"); that is the part D01 defers. Only two mentors gave a conditional yes to paid 25-minute text ("no w sumie czemu nie", "to bym może zrobiła"); the staff engineer said she does not need the money, and none gave rate or weekly hours. `[INTERVIEW]` `2026-08-22-interview-mentor.md`, `2026-09-03-interview-senior-python-meetups.md`, `2026-09-03-interview-staff-engineer-declined-before.md`
- Beachhead chosen by the founders: English-speaking TypeScript, React, Python and AI-agent developers. `[DOCUMENT]` `2026-09-02-miro-board-vision-target-needs.md`
- Mentor areas in Now are TypeScript, React and Python only (D04), narrower than the board's beachhead. `[DOCUMENT]` `decisions/D04-listing-by-area-and-direct-link.md`
- By stack label, Now's three areas cover 67 of the 109 Discord threads (Python 28, TypeScript 23, React 16) and 17 of the 31 urgent ones; AI-agent threads (18), Node (11) and other (13) are outside. Of the 50 listed mentors, 34 are in those areas (Python 14, TypeScript 10, React 7, TypeScript/React 3), 4 are Python/AI agents, and 12 are AI agents only. `[DATA]` `2026-09-04-discord-help-requests.csv`, `2026-09-04-mentor-list.csv`
- None of the data is independent of the founders' reach: the Discord export and survey come from one community through founder B, and the interviewees came through the founders' contacts, groups and mentor list, so the seven "data" lines are not seven independent sources. `[DATA]` `2026-09-04-data-request-discord-help.md`
- The transcripts of five of the seven interviews are in Polish; whether the English-speaking beachhead was interviewed is untested (A07). `[INTERVIEW]` the five Polish-transcript notes of 2026-09-01, 2026-09-02 (two) and 2026-09-03 (two)
- Stakeholders: the RACI export of 2026-09-05 puts sponsor, product owner and UX/UI with founder A, and project manager, tech lead and developer with founder B; on 2026-10-15 founder A stated they also act as tech lead for this project. QA and legal have no person behind them; Stripe is the payment dependency. `[DOCUMENT]` `2026-09-05-miro-board-raci-matrix.md`, `decisions/D01-first-build-paid-text-sessions.md`
- Decider for scope decisions: the product owner (founder A; named decider in the workshop, confirmed in this session). `[DOCUMENT]` `2026-08-26-workshop-export.md`

## Problems, with evidence

- A developer hits a specific blocker with nobody to ask in time. The fintech developer spent an hour searching on a Friday evening, got a wrong answer on Saturday from a Discord, rolled back, and the release slipped from Monday to Tuesday; this was one Friday, and the account does not say how often it happens. `[INTERVIEW]` `2026-09-01-interview-backend-dev-fintech.md`
- The freelancer sent a migration estimate that was too low after two evenings of reading and an "it depends" answer on a Discord, and says it cost about a week of unpaid time; "ciągle" (all the time) was never quantified. This episode was an estimate, which the freelancer said he would talk through by call ("do wyceny rozmowa"); only his bug-type need is a stated fit for text. `[INTERVIEW]` `2026-09-02-interview-freelancer-react.md`
- The working developer lost half a day on a TypeScript generics error, shipped a workaround with a TODO, and has not trusted that code since. `[INTERVIEW]` `2026-08-20-interview-working-dev.md`
- In the same Discord, 109 help threads were opened in 14 days (2026-08-18 to 2026-08-31), 23 (21%) got no human reply, and the median wait for a first reply among the 86 answered was 67 minutes; the founder B reading aid says 68 and 23 partial, the CSV gives 67 and 20, so the CSV figures are used here. `[DATA]` `2026-09-04-discord-help-requests.csv`
- 31 threads (28%) carried an urgency signal such as "release tomorrow", "prod is down" or "client waiting", and 9 of those got no reply; 35 threads ended solved, 20 partially, 45 not solved and 9 unknown, judged by one person from the last message. `[DATA]` `2026-09-04-discord-help-requests.csv`
- In the survey, 11 of 54 were stuck without anyone to ask this week and 19 this month; 49 searched or read docs, 38 asked an AI assistant, 31 asked a community, 3 paid someone. One community, self-selected, five days. `[DATA]` `2026-09-04-survey-discord-willingness-to-pay.md`, questions 1 and 2
- Mentors answer repeat questions unpaid and from private notes: two evenings a month and "the notes rot"; ten minutes most evenings from a paste doc, never charged ("faktury. nie"); and constant Slack questions, of which only the ones that are a specific broken thing get an answer. `[INTERVIEW]` `2026-08-22-interview-mentor.md`, `2026-09-03-interview-senior-python-meetups.md`, `2026-09-03-interview-staff-engineer-declined-before.md`
- When asked how they would pick the person (several answers allowed), 41 of 54 chose what they have built or written, against 12 who chose ratings; the fintech developer and the freelancer each said everyone has five stars or 4.9. `[DATA]` `2026-09-04-survey-discord-willingness-to-pay.md`, question 6
- Willingness to pay is a stated intention: 37 of 54 said they would pay something, 17 nothing, 23 at least 25 EUR, and only 3 have paid anyone. `[DATA]` `2026-09-04-survey-discord-willingness-to-pay.md`, questions 2 and 3
- The need for a mentee is an answer to a specific problem, not a course or a relationship: "I don't want a course, I want an answer"; "nie szukam mentora tylko kogos kto sprawdzi jedna rzecz". `[INTERVIEW]` `2026-08-20-interview-working-dev.md`, `2026-09-02-interview-freelancer-react.md`
- The reason for the delays on the Discord (no one online, no one who has done it) is the agent's inference from the accounts, not a measurement. `[ASSUMPTION]` inference; see A03

## Product and how it stands out

- What it is: a marketplace to find, book and pay a senior engineer for a 25- or 50-minute text session; the first build is limited to this (D01, see Scope). `[DOCUMENT]` `2026-09-07-source-readme.md`
- What makes it different, as observed on checked pages: four of the five reference products (Codementor, MentorCruise, ADPList, Preply) show star ratings on mentor profiles or cards, and Topmate claims "100k+ reviews" without a formal rating system on its home page; none of the five benchmark notes records a feature that keeps session notes. `[BENCHMARK]` `2026-09-04-benchmark-*.md`
- Whether being text-only, ratings-free and one-off is an advantage is a hypothesis resting on the interviews behind N01 and N02, not on a comparison of outcomes. `[ASSUMPTION]` team belief; see A06

| reference | what it does well | where it falls short for our users | checked on | link |
|---|---|---|---|---|
| Codementor | request-to-live-session is the whole product; mentors vetted | nothing from a session kept; the 2026-09-01 developer took 40 minutes to find someone; 10 of 10 React cards show 5.0, so rating carries no information; rates $15 to $80 per 15 min | 2026-09-04 | https://www.codementor.io/ |
| MentorCruise | free intro call; named-company mentors | from about $100 a month for a monthly relationship; the staff engineer declined an invitation as a mentor because she does not want a relationship | 2026-09-04 | https://mentorcruise.com/ |
| ADPList | free, fast booking at scale | the page states nothing about mentors earning; design and product dominate | 2026-09-04 | https://adplist.org/ |
| Topmate | expert owns page, price, audience; 10% on own link, 20% via marketplace | any profession; no way to find an expert you do not follow | 2026-09-04 | https://topmate.io/ |
| Preply | trial lesson, free switch or refund, 12-hour free cancellation | recurring-lesson model; ratings as the trust signal | 2026-09-04 | https://preply.com/en/how-it-works |

## Goals and success criteria

- Business goal: the provisional target is 10 paid sessions per week for two consecutive weeks by the end of December 2026; chosen by the product owner with no basis or baseline supplied (D02); the stop rule is D08. `[DOCUMENT]` `decisions/D02-provisional-success-target.md`
- The board's year-one goals (100 mentors with published vaults, 30% of mentees on a vault subscription) are for the full vision and are not adopted for the first build. `[DOCUMENT]` `2026-09-02-miro-board-product-goals.md`
- User outcome, as conditions named in interviews rather than a measured result: an answer from someone who has done the same thing, in about twenty minutes (fintech) or the same day (freelancer), as text for bugs, with the price known before writing. `[INTERVIEW]` `2026-09-01-interview-backend-dev-fintech.md`, `2026-09-02-interview-freelancer-react.md`
- Primary metric: paid sessions per week; baseline today is zero because no product exists and nobody has paid (statement of the product owner, 2026-10-15); threshold and date per D02. `[DOCUMENT]` `decisions/D01-first-build-paid-text-sessions.md`
- Build budget: "25 hours of build time for the MVP; no payments provider integration beyond Stripe; no video" (workshop constraints, decided by founder A). `[DOCUMENT]` `2026-08-26-workshop-export.md`
- The board's feasibility line "MVP in 25 hours, one AI feature (answer from vault), transcription and AI note drafting deferred" was written for a scope that included the vault answer; no file sizes paid text sessions against 25 hours (A02). `[DOCUMENT]` `2026-09-02-miro-board-product-goals.md`
- The user outcome conditions above are partly traded away: D03 chooses a booked slot, so the earliest start is not guaranteed, a conscious trade-off against the twenty-minute to same-day conditions and the urgent Discord threads (A03). `[DOCUMENT]` `decisions/D03-booked-slot.md`
- What must not get worse: no existing product or data; the constraints are N01, N02 and R01 to R05.

## Scope
- **Now:** paid text help (D01).
  - Mentor: a public profile with links to public work (TypeScript, React or Python) and a plain description (N02); a price set per format (D06); a schedule of slots; bookable only after Stripe onboarding (D05).
  - Discovery: a public listing filtered by area, plus a direct link to each profile (D04).
  - Mentee: picks an available slot and pays when booking through Stripe (D03, R03, R01); receives the Stripe receipt (D07); gets written help in the session, text only (N01).
  - Refunds and no-show payouts: handled manually by the operator in Stripe (R05, D09).
- **Later:** vault, MCP access and subscriptions (D01); the AI answer from the vault, transcription and AI note drafting (board); the 24-hour asynchronous tier; private session notes for the mentee, with nothing published (R02 applies if publishing is ever added); VAT invoices and employer-paid sessions, Won't have in 1.0 (D07); automatic no-show detection (D09).
- **Not doing:** see Non-goals.

## Domain glossary
| Term | Meaning | Owned by | Visible to |
|---|---|---|---|
| Session | a paid, text-only exchange booked in a slot the mentee picks from the mentor's schedule and pays for at booking; 25 or 50 minutes is its length, not a waiting time, and the earliest start is not guaranteed (D03, R01, N01) | platform | mentor, mentee |
| Mentor | a senior engineer in TypeScript, React or Python with links to public work who offers sessions; called expert in some interviews | the mentor | everyone, through the listing or the direct link (D04) |
| Mentee | the developer who pays for a session | the mentee | the booked mentor |
| Listing | the public page of mentors, filtered by area (TypeScript, React, Python); each profile also has a direct link (D04) | platform | everyone |
| Bookable | a mentor's state after completing Stripe onboarding; a profile is not bookable before (D05) | the mentor | mentees |
| Public work link | the mentor's link to what they have done, used instead of ratings (N02) | the mentor | mentees |
| Operator | whoever handles refunds and no-show payouts by hand in Stripe in 1.0 (R05) | product owner | not visible to users |
| Vault | a mentor-owned set of notes sold as a subscription; deferred (D01) | the mentor | not in the first build |

## Key flows

- Current state, a mentee: an hour of search, a post on a Discord or Slack, a wrong or late reply, a workaround or rollback. `[INTERVIEW]` `2026-09-01-interview-backend-dev-fintech.md`
- Current state, a mentee, board reconstruction: ask friends and Discord, judge the expert from LinkedIn and GitHub, exchange times, agree a payment method, hold the session on Meet or Zoom, with no notes afterwards. The board states these stages restate the mentee interview of 2026-08-20; thoughts and emotions are the founders' reconstruction. `[DOCUMENT]` `2026-09-02-miro-board-journey-current-state.md`
- Current state, a mentor: paste from a private doc in a DM or Slack, for free. `[INTERVIEW]` `2026-09-03-interview-senior-python-meetups.md`
- Future state, a mentor: completes Stripe onboarding, creates a profile with links to public work, sets a price per format and a schedule; the profile then becomes bookable. `[DOCUMENT]` `decisions/D05-stripe-onboarding-before-bookable.md`, `decisions/D06-mentor-sets-price-commission-20.md`
- Future state, a mentee: finds a mentor through the listing filtered by area or a direct link, picks an available slot, pays when booking, receives the Stripe receipt, and gets written help in the session. `[DOCUMENT]` `decisions/D03-booked-slot.md`, `decisions/D04-listing-by-area-and-direct-link.md`, `decisions/D07-receipt-only-no-vat-invoices.md`
- Future state, unhappy path: a refund or a no-show payout is done by the operator in Stripe; there is no automatic no-show detection. `[DOCUMENT]` `decisions/D09-accept-r04-r05-manual-handling.md`
- Conditions named in interviews that the flow has to meet or consciously drop: booking under five minutes (A05); price known before writing (R04); the mentor sees who asks and the question before accepting (open: Q10); no bank details before the first booking, which D05 drops and the product owner accepts losing a mentor over. Each is one person's statement. `[INTERVIEW]` `2026-09-01-interview-backend-dev-fintech.md`, `2026-09-02-interview-freelancer-react.md`, `2026-09-03-interview-senior-python-meetups.md`, `2026-09-03-interview-staff-engineer-declined-before.md`
- The board's future-state journey (vault from the IDE, reviews, Meet or Zoom session) predates N01, N02 and D01 to D09 and is not the flow of the first build. `[DOCUMENT]` `2026-09-04-miro-board-journey-future-state.md`

## Business rules
| Id | Rule | Applies to | Source | Status | Review by | Required path to change | Owner | Supersedes |
|---|---|---|---|---|---|---|---|---|
| R01 | Sessions are 25 or 50 minutes ("bookable in a lunch break") | all sessions | `[DOCUMENT]` `2026-08-26-workshop-export.md` | active | unknown | superseding row approved by the product owner | product owner | none |
| R02 | Nothing from a session is published without the mentee's approval ("trust is the product") | any published session note | `[DOCUMENT]` `2026-08-26-workshop-export.md` | active | unknown; not exercised until publishing exists | superseding row approved by the product owner | product owner (decided by both founders) | none |
| R03 | The mentee pays through Stripe when booking, before the session | all sessions | `[DOCUMENT]` `decisions/D01-first-build-paid-text-sessions.md`, `decisions/D03-booked-slot.md` | active | unknown | superseding row approved by the product owner | product owner | none |
| R04 | The mentee sees the price before writing anything | booking | `[DOCUMENT]` `decisions/D09-accept-r04-r05-manual-handling.md`; origin: one interview, `2026-09-02-interview-freelancer-react.md` | active | unknown | superseding row approved by the product owner | product owner | none |
| R05 | A mentor no-show is refunded the same day; a mentee no-show is paid out to the mentor; in 1.0 both are handled manually by the operator in Stripe, with no automatic no-show detection | prepaid sessions | `[DOCUMENT]` `decisions/D09-accept-r04-r05-manual-handling.md`; origin: one interview each, `2026-09-02-interview-freelancer-react.md`, `2026-09-03-interview-senior-python-meetups.md` | active | unknown | superseding row approved by the product owner | product owner | none |

## Non-goals

| Id | We are not building | Why | Owner | Status | Review by | Required path to change | Source | Supersedes |
|---|---|---|---|---|---|---|---|---|
| N01 | Video calls; sessions are text and the product says so on every session screen | workshop constraint and the mentee interview ("text is fine, faster") | product owner | active | unknown | superseding record by the product owner | `[DOCUMENT]` `decisions/N01-no-video.md` | none |
| N02 | Ratings or a reviews profile; every mentor page carries a link to public work and a plain description instead | the mentor interview ("my GitHub is my profile") | product owner | active | unknown | superseding record by the product owner | `[DOCUMENT]` `decisions/N02-no-ratings.md` | none |

## Decisions
| Id | Date | Decision | Why | Owner | Status | Review by | Required path to change | Source | Supersedes |
|---|---|---|---|---|---|---|---|---|---|
| D01 | 2026-10-15 | The first build is paid text help; vault, MCP access and subscriptions are deferred. The product owner accepts building before A01 is tested | three of four mentees did not want a subscription or saved answers and want an answer to a specific problem (`2026-08-20-interview-working-dev.md`, `2026-09-01-interview-backend-dev-fintech.md`, `2026-09-02-interview-platform-dev-solves-alone.md`); the 25-hour budget was sized for a vault scope (`2026-08-26-workshop-export.md`, `2026-09-02-miro-board-product-goals.md`); the alternative weighed was the board's vault-first MVP | product owner | active | unknown | superseding row approved by the product owner | `[DOCUMENT]` `decisions/D01-first-build-paid-text-sessions.md` | none |
| D02 | 2026-10-15 | Provisional target: 10 paid sessions per week for two consecutive weeks by the end of December 2026 | chosen by the product owner; no basis or baseline supplied | product owner | active | 2026-12-31 (the target date) | superseding row approved by the product owner | `[DOCUMENT]` `decisions/D02-provisional-success-target.md` | none |
| D03 | 2026-10-15 | Sessions are booked in a slot the mentee picks from the mentor's schedule and pays for at booking; the earliest start is not guaranteed | conscious trade-off against the twenty-minute to same-day need and the 28% urgent Discord threads; session length is not waiting time | product owner | active | unknown | superseding row approved by the product owner | `[DOCUMENT]` `decisions/D03-booked-slot.md` | none |
| D04 | 2026-10-15 | Discovery is a public listing filtered by area (TypeScript, React, Python) plus a direct link to each mentor's profile | decided by the product owner; two mentors had resisted being listed beside strangers (`2026-09-03-interview-staff-engineer-declined-before.md`, `2026-09-03-interview-senior-python-meetups.md`) | product owner | active | unknown | superseding row approved by the product owner | `[DOCUMENT]` `decisions/D04-listing-by-area-and-direct-link.md` | none |
| D05 | 2026-10-15 | A mentor completes Stripe onboarding before the profile is bookable; verifying Stripe's requirements is a task for the tech lead; losing a mentor who refuses is accepted | decided by the product owner; one mentor refused to give bank details before a first booking (`2026-09-03-interview-senior-python-meetups.md`) | product owner | active | unknown | superseding row approved by the product owner | `[DOCUMENT]` `decisions/D05-stripe-onboarding-before-bookable.md` | none |
| D06 | 2026-10-15 | The mentor sets the price per format; platform commission 20%, provisional, taken from the board position (15 to 20%) | decided by the product owner; Topmate takes 10% on a mentor's own link and 20% via its marketplace (`2026-09-04-benchmark-topmate.md`) | product owner | active | after the first 20 sessions | superseding row approved by the product owner | `[DOCUMENT]` `decisions/D06-mentor-sets-price-commission-20.md` | none |
| D07 | 2026-10-15 | In 1.0 the mentee gets the Stripe receipt only; VAT invoices and employer-paid sessions are Won't have this time | decided by the product owner; 19 of 54 survey respondents expect an employer to pay (`2026-09-04-survey-discord-willingness-to-pay.md`) | product owner | active | unknown | superseding row approved by the product owner | `[DOCUMENT]` `decisions/D07-receipt-only-no-vat-invoices.md` | none |
| D08 | 2026-10-15 | If D02 is not reached by 2026-12-31, stop and re-run discovery before building more | decided by the product owner | product owner | active | 2026-12-31 | superseding row approved by the product owner | `[DOCUMENT]` `decisions/D08-stop-rule.md` | none |
| D09 | 2026-10-15 | Accept R04 and R05; in 1.0 refunds and no-show payouts are handled manually by the operator in Stripe | decided by the product owner | product owner | active | unknown | superseding row approved by the product owner | `[DOCUMENT]` `decisions/D09-accept-r04-r05-manual-handling.md` | none |

## Riskiest assumptions

| Id | Assumption | Importance | Evidence today | If false | Smallest test | Owner | By when | Result |
|---|---|---|---|---|---|---|---|---|
| A01 | Developers will pay for a written answer from a stranger `[ASSUMPTION]` team belief | high | 37 of 54 say they would pay something and 3 ever have (survey); one observed past purchase: the fintech developer paid for help on Codementor about two years ago, found it fine, and the exchange was lost to 40 minutes of search and a call that failed, not to price; the fintech developer's "chyba" and the freelancer's "zależy ile" are stated intentions; the platform developer would not pay and 17 of 54 would pay nothing | the first build has no revenue and the target in D02 is unreachable | none before the build (no by-hand test, D01); the launch itself, read as paid sessions per week against D02, with the stop rule D08; limits: only visible after the build | product owner | 2026-12-31 | accepted untested (D01) |
| A02 | Paid text sessions with Stripe fit the 25-hour build constraint `[ASSUMPTION]` | high | the constraint is stated; the board's feasibility claim was for a scope with a vault answer | scope or schedule changes | estimate Now against 25 hours; observable: a task list with hours; limits: an estimate | tech lead (the product owner holds this role) | unknown | untested |
| A03 | A booked slot with no guaranteed earliest start still serves a stuck developer `[ASSUMPTION]` consequence of D03 | high | mentees named about twenty minutes (fintech), the same day (freelancer) and within the hour (working developer); 31 of 109 Discord threads (28%) carried an urgency signal; mentors described themselves as available "between meetings" and for "ten minutes if I'm in the mood"; no data on how soon slots would be available | urgent buyers do not book; an on-demand or answer-within-a-window model replaces D03 | after launch, record the hours from payment to session start for each booking and how many start the same day; limits: abandoned buyers are not visible | product owner | unknown | untested |
| A04 | Enough of the 50 listed mentors will accept, complete Stripe onboarding and publish slots `[ASSUMPTION]` | high | nobody has been contacted; 29 of 50 have a warm contact, 33 have public work found, and 34 are in Now's three areas; the staff engineer would not be listed beside strangers, wants to see who else is there, and would "forget it exists" if nobody booked in a month; the Python speaker would decline a list of twenty unknown people, refuses bank details before a first booking (D05), and stays with DMs if it is only a calendar | too few mentors to reach D02 | invite the warm-contact mentors in the three areas; observable: acceptances, completed Stripe onboarding and published slots; limits: warm contacts only | product owner | unknown | untested |
| A05 | Account creation and prepayment fit inside the time a stuck developer will give `[ASSUMPTION]` | medium | one account: "jak booking trwa więcej niż pięć minut to robię rollback" | mentees abandon at checkout | time an instrumented sign-up and prepayment (for example a payment link); the by-hand A01 test cannot observe it | pending | unknown | untested |
| A06 | Text is enough for most blockers `[ASSUMPTION]` | medium | 33 of 54 prefer text, 9 a call, 12 depends; the freelancer wants a call for estimates, and his cited episode was an estimate | sessions lost to the no-video rule N01 | note the requests for a call in the A01 test | pending | unknown | untested |
| A07 | The people interviewed represent the English-speaking beachhead `[ASSUMPTION]` | medium | five of seven transcripts are in Polish; the Discord and survey are English-speaking | the beachhead or channel changes | record language and market for each new interviewee | pending | unknown | untested |
| A08 | Developers would subscribe to a mentor's vault `[ASSUMPTION]` board | high for the longer vision, none for Now | no mentee was shown a vault; three of four said they would not use a subscription or saved answers; two of three mentors call their notes the value | Later scope and the vision's second half | deferred by D01 | product owner | after the D02 review | untested |

## Kill criteria
If D02 is not reached by 2026-12-31, stop and re-run discovery before building more (D08), decided by the product owner. No interim checkpoint was set, and the target itself has no empirical basis (D02).

## Hypotheses to test

None. No synthetic walkthrough has been run.

## Open questions
| Id | Question | Blocking | Who can answer | Status |
|---|---|---|---|---|
| Q01 | When does the mentee get the written answer? | yes: booking flow | product owner | closed: booked slot, D03 |
| Q02 | How does a mentee find a mentor? | yes: mentee flow | product owner | closed: listing by area plus direct link, D04 |
| Q03 | When does a mentor provide payout details? | yes: mentor onboarding | product owner and tech lead | closed: Stripe onboarding before bookable, D05; verifying Stripe's requirements remains a task for the tech lead, date unknown |
| Q04 | Who sets the session price, and what is the commission? | yes: checkout | product owner | closed: mentor sets price, 20% provisional, D06 |
| Q05 | Who owns terms of service and data processing? The RACI gives legal no person; the product owner is the default | no for planning; blocks release go or no-go | product owner | open |
| Q06 | What result would make the team stop or revise, and by when? | no for planning | product owner | closed: D08 |
| Q07 | Who issues the invoice or receipt when an employer pays? | yes: checkout | product owner | closed: Stripe receipt only, D07 |
| Q08 | Are the developers you would sell to allowed to share company code or config with an outside mentor, and does a mentor's employer allow paid side work? Neither was asked in any interview | no for planning; relevant before inviting mentors | developers and mentors (collection plan) | open |
| Q09 | What does the first build give a mentee or mentor that Topmate (one link, expert sets price, 10% commission) or Codementor (closest to the job) does not, given that two mentors want link-only access? | no: informs positioning | product owner | open |
| Q10 | Can a mentor see the mentee's problem and decline before the session? Two mentors asked to see who is asking first; the booked-slot flow as described has no decline step | no for planning; settles refunds on a decline | product owner | open |

## Definition of Ready addendum (own)
- Problem and who has it: supported by three of four developer accounts, the Discord export and the survey, within their limits (one community, self-selected, founders' contacts). Target group has partial support (A07).
- Expected outcome and check: D02, read as paid sessions per week; stop rule D08.
- Out of scope: N01, N02 and the Later list under Scope.
- Blocking questions: none open. Q05, Q08, Q09 and Q10 are non-blocking for planning.
- Autonomous assumptions: none.
- Untested beliefs: A01 is accepted untested by the product owner (D01); that is permission to take the risk, not evidence of willingness to pay. A02 to A07 are untested, each with a test in the table.
- Ready for: implementation planning of Now. Signed by the product owner (who is also tech lead) on 2026-10-15.

## Collection plan
### Can enough mentors publish slots, and are they allowed to?

- What decision or work needs it: A03 and A04, and Q08; none of the three mentor interviews recorded weekly hours, rate or employer stance.
- Who can answer it: engineers from the 50-name list in TypeScript, React or Python with a warm contact.
- How: one conversation each during the invitations, captured with the interview-note template.
- Owner and by when: the product owner (discovery A,R in the RACI); date unknown.
- Template: `.ai/specs/research/templates/interview-note.md`

