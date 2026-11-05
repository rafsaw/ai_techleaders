# Backlogs

## .ai/specs/product-brief.md
Backlog source: .ai/specs/product-brief.md
Last filed: 2026-10-17

| Id | Issue | Title | Epic/Story | Depends on | Adopted |
|---|---|---|---|---|---|
| E01 | #28 | Accounts and access | — | — | no |
| E02 | #29 | Mentor profile, pricing, slots and Stripe onboarding | — | — | no |
| E03 | [#30](https://github.com/rafsaw/ai_techleaders/issues/30) | Discovery | — | — | no |
| E04 | #31 | Booking and payment | — | — | no |
| E05 | #32 | Text session | — | — | no |
| E06 | #33 | Later | — | — | no |
| E01-S01 | #34 | A visitor signs in with GitHub and gets an account with a display name | #28 | — | no |
| E01-S02 | #35 | A person without GitHub signs up with email and password and confirms the address | #28 | #34 | no |
| E01-S03 | #36 | An invited engineer opens a single-use link and gets the mentor role | #28 | #34 | no |
| E02-S01 | #37 | A mentor publishes a profile with area, public-work links, description and a price per format | #29 | #36 | no |
| E02-S02 | #38 | A mentor completes Stripe onboarding and only then becomes bookable | #29 | #37 | no |
| E02-S03 | #39 | A mentor publishes availability slots | #29 | #37 | no |
| E03-S01 | [#40](https://github.com/rafsaw/ai_techleaders/issues/40) | A mentee browses the public listing filtered by area and opens a mentor profile, also by direct link | #30 | #38, #39 | no |
| E04-S01 | #41 | A mentee picks an eligible slot and duration, sees the price, and returns to the same slot after signing in | #31 | #40, #34 | no |
| E04-S02 | #42 | A mentee pays through Stripe and the booking is confirmed only on payment confirmation | #31 | #41, #38 | no |
| E04-S03 | #43 | Both participants receive booking information in the product and by email | #31 | #42 | no |
| E05-S01 | #44 | A participant sees a private list of their upcoming and past sessions | #32 | #43 | no |
| E05-S02 | #45 | Two participants exchange text messages on the session screen during the booked window | #32 | #44 | no |
| E01-S03-T01 | #46 | Operator can create a single-use mentor invitation link without a UI | #36 | — | no |
| E02-S02-T01 | #47 | Verify Stripe's onboarding requirements | #38 | — | no |

## E04 design clarification — PO approved 2026-11-04

[E04 specification](2026-11-04-booking-and-payment.md) now covers epic #31 and the existing three phases/stories #41–#43. [D17](research/decisions/2026-11-04-d17-checkout-holds-and-compensation.md) replaces the earlier undecided/no-hold assumption: public-slot URL plus existing sign-in returnTo, hold only at Pay with a five-minute target, safe Stripe reconciliation before release, and automatic compensation for paid attempts that cannot book. Current D16 is rechecked, never frozen. Phase 2 builds booking/payment/refund mechanics; Phase 3 adds participant-facing details and emails. E04 rejects self-booking before Checkout and at paid claim, with integration coverage. Real-user Checkout remains disabled until E05 Phase 2 supplies the usable paid exchange and E04/E05 release evidence passes. No Selection entity, E04 booking list or event bus. GitHub issue wording updates are deferred as itemized in E04; Q13 remains a release condition. This note changes no story IDs, dependencies or implementation-completion status.

## E05 design clarification — PO approved 2026-11-05

[E05 specification](2026-11-04-text-sessions.md) covers epic #32 in one spec and two implementation phases: #44 adds the participant-only Upcoming/Past `/sessions` lists and time/text-only state to E04's existing `/bookings/[id]` detail; #45 adds retained message history and a composer there. [D18](research/decisions/2026-11-05-d18-text-session-experience.md) records the 4,000-code-point limit, no edit/unsend/delete UI, all retained history reachable in 100-message pages, and five-second polling only on a visible newest open-session view, with immediate return refresh and one final read at the exact end. Retention/deletion remains deferred. E05 extends E04's `BookingService` with participant-scoped `listForParticipant(principal)`; it adds no separate list service, generic list primitive, pagination, WebSocket, external provider or cancellation/no-show workflow. E04 owns the self-booking guard. GitHub Issues #32/#44/#45 and any implementation-status documentation are unchanged; their wording can be reconciled during implementation review. This note changes no story IDs, dependencies or completion status.
