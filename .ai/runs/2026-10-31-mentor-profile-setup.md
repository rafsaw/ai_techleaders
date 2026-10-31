# E02-S01 mentor profile setup — execution plan

Source doc: .ai/specs/2026-10-18-mentor-setup.md
Story: #37 (E02-S01)
Epic: #29 (E02)
Approved UX: .ai/prototypes/discovery/mentor-onboarding/revision-002

## Goal

Ship Phase 1 of E02 so an invited mentor can create and edit a validated public profile with an area, public-work links, a plain description, and USD prices for 25- and 50-minute text sessions.

## Scope

- Add the money and mentor-profile contracts, persistence, service, API route, request-time pages, and dependency-injection registration.
- Implement `/mentor`, `/mentor/profile`, and public `/mentors/[id]` from the approved Storybook E02 components and screen examples.
- Send newly accepted mentors to `/mentor`, expose the mentor-only header link, and cover the full Phase 1 journey in integration tests.
- Record the additive API, export, Cradle, and database contracts and keep the E02 spec in place because Phases 2 and 3 remain outstanding.

## Non-goals

- Stripe onboarding, payout state, webhooks, or bookability beyond Phase 1's always-false result.
- Availability slots, the E03 mentor listing, booking, payment, ratings, reviews, video, cancellation, refunds, or dispute handling.
- The discovery prototype's seven-stage progress indicator; revision-002 documents it as a simulation assumption rather than an E02 Phase 1 requirement.

## Risks

- The migration adds a protected schema surface, so it needs reversible SQL and migration coverage.
- Profile ownership and public visibility cross authentication and data-scoping boundaries; denied-role and removed-role paths need explicit tests.
- The public route must remain Tailwind-only while signed-in routes use the shadcn form and checklist components.
- The profile is public before Stripe setup but must remain visibly not bookable until Phase 2.

## Implementation Plan

### Phase 1: E02-S01 profile and prices

1. Add the USD money helpers and mentor-profile validators with exhaustive boundary and error-message tests.
2. Add the `MentorProfile` entity, exports, reversible migration, and migration coverage.
3. Add and register `MentorProfileService` with create/replace/retry, DTO, public visibility, setup, and Phase 1 bookability tests.
4. Add the mentor-only `PUT /api/mentors/profile` route with validation and access-matrix tests.
5. Build the signed-in setup/profile pages and public profile page from the approved Storybook components, extending `CrudForm` only where required and covering all page states.
6. Route invitation acceptance to `/mentor`, enable the mentor-only header link, and add the Phase 1 browser journey plus denied-role coverage.
7. Update protected-contract documentation and the autonomous run record, then run the full project and UI validation gates.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: E02-S01 profile and prices

- [x] 1.1 Add the USD money helpers and mentor-profile validators with exhaustive boundary and error-message tests. — 4abcb2c
- [x] 1.2 Add the `MentorProfile` entity, exports, reversible migration, and migration coverage. — 87734af
- [x] 1.3 Add and register `MentorProfileService` with create/replace/retry, DTO, public visibility, setup, and Phase 1 bookability tests. — 07c55f0
- [x] 1.4 Add the mentor-only `PUT /api/mentors/profile` route with validation and access-matrix tests. — 0972fc7
- [ ] 1.5 Build the signed-in setup/profile pages and public profile page from the approved Storybook components, extending `CrudForm` only where required and covering all page states.
- [ ] 1.6 Route invitation acceptance to `/mentor`, enable the mentor-only header link, and add the Phase 1 browser journey plus denied-role coverage.
- [ ] 1.7 Update protected-contract documentation and the autonomous run record, then run the full project and UI validation gates.
