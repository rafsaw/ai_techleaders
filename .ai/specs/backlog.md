# Backlogs

## .ai/specs/product-brief.md
Backlog source: .ai/specs/product-brief.md
Last filed: 2026-10-17

| Id | Issue | Title | Epic/Story | Depends on | Adopted |
|---|---|---|---|---|---|
| E01 | #28 | Accounts and access | — | — | no |
| E02 | #29 | Mentor profile, pricing, slots and Stripe onboarding | — | — | no |
| E03 | #30 | Discovery | — | — | no |
| E04 | #31 | Booking and payment | — | — | no |
| E05 | #32 | Text session | — | — | no |
| E06 | #33 | Later | — | — | no |
| E01-S01 | #34 | A visitor signs in with GitHub and gets an account with a display name | #28 | — | no |
| E01-S02 | #35 | A person without GitHub signs up with email and password and confirms the address | #28 | #34 | no |
| E01-S03 | #36 | An invited engineer opens a single-use link and gets the mentor role | #28 | #34 | no |
| E02-S01 | #37 | A mentor publishes a profile with area, public-work links, description and a price per format | #29 | #36 | no |
| E02-S02 | #38 | A mentor completes Stripe onboarding and only then becomes bookable | #29 | #37 | no |
| E02-S03 | #39 | A mentor publishes availability slots | #29 | #37 | no |
| E03-S01 | #40 | A mentee browses the public listing filtered by area and opens a mentor profile, also by direct link | #30 | #38, #39 | no |
| E04-S01 | #41 | A mentee picks an eligible slot and duration, sees the price, and returns to the same slot after signing in | #31 | #40, #34 | no |
| E04-S02 | #42 | A mentee pays through Stripe and the booking is confirmed only on payment confirmation | #31 | #41, #38 | no |
| E04-S03 | #43 | Both participants receive booking information in the product and by email | #31 | #42 | no |
| E05-S01 | #44 | A participant sees a private list of their upcoming and past sessions | #32 | #43 | no |
| E05-S02 | #45 | Two participants exchange text messages on the session screen during the booked window | #32 | #44 | no |
| E01-S03-T01 | #46 | Operator can create a single-use mentor invitation link without a UI | #36 | — | no |
| E02-S02-T01 | #47 | Verify Stripe's onboarding requirements | #38 | — | no |
