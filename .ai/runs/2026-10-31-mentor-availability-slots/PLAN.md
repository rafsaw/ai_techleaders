# Mentor availability slots — Phase 3

Source spec: .ai/specs/implemented/2026-10-18-mentor-setup.md
Base: PR #63 (`feat/mentor-stripe-onboarding`)

## Tasks

| Phase | Step | Title | Exec | Status | Commit |
|-------|------|-------|------|--------|--------|
| 3 | 3.1 | Validate slot instants and ownership | dispatch:cheap | done | 28b5a47 |
| 3 | 3.2 | Persist availability slots | dispatch | done | f65c63b |
| 3 | 3.3 | Implement slot service and setup counts | dispatch | done | ba8f943 |
| 3 | 3.4 | Expose slot routes | dispatch | done | d01164b |
| 3 | 3.5 | Build mentor slot management UI | dispatch | done | 4d67176 |
| 3 | 3.5-review-fix | Correct missing profile conflict | dispatch:cheap | done | 805c1b6 |
| 3 | 3.6 | Verify availability flows and document contracts | dispatch | done | ee6415a |
| 3 | 3.6-review-fix | Update database configuration expectation | inline | done | 420c243 |
| 3 | 3.6-integration-fix | Expect the no-upcoming-slots state after Stripe readiness | dispatch:cheap | done | 88215eb |
| 3 | 3.7 | Complete post-gate documentation | inline | done | 77af142 |
| 3 | 3.8-review-fix | Reject nonexistent local times and verify slot isolation | inline | done | e3bb576 |

## Goal

Complete Phase 3 of mentor setup: mentors publish and withdraw concrete slots, with race-safe rules and clear setup status.

## Scope

Slot validation, persistence, service, routes, mentor UI, coverage, integration and documentation per Phase 3. Use the revision-002 prototype and Storybook components.

## Non-goals

Booking, recurring availability, and public slot selection are future work.

## Implementation Plan

1. Validate slot instants and ownership: implement spec validators, constants and P5 with unit tests.
2. Persist availability slots: entity, migration including rollback, registrations and migration tests.
3. Implement slot service and setup counts: locking, timing, conflicts, ownership, booked handling and unit tests.
4. Expose slot routes: authenticated POST and DELETE with unit tests.
5. Build mentor slot management UI: setup checklist, local-time rendering and form with unit tests.
6. Verify availability flows and document contracts: browser and real-database integration cases, compatibility and spec status after gate.

7. Correct missing profile conflict: align the publish service error with the spec and cover it.

8. Update database configuration expectation: include the new registered entity in its existing assertion.

9. Reject nonexistent local times and verify slot isolation: avoid silently shifting a daylight-saving gap and prove mentor isolation with PostgreSQL.

## Risks

Concurrent slot publication and booked-slot withdrawal require database-level serialization; timestamps and browser time zones require explicit verification. The stacked base may change before merge.

## External References

No external skill URLs. Prototype: .ai/prototypes/discovery/mentor-onboarding/revision-002/.
