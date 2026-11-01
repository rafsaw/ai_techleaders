# Mentor availability slots — Phase 3

Source spec: .ai/specs/2026-10-18-mentor-setup.md
Base: PR #63 (`feat/mentor-stripe-onboarding`)

## Tasks

| Phase | Step | Title | Exec | Status | Commit |
|-------|------|-------|------|--------|--------|
| 3 | 3.1 | Validate slot instants and ownership | dispatch:cheap | done | step-3.1-slot-validation-and-owner |
| 3 | 3.2 | Persist availability slots | dispatch | done | step-3.2-slot-persistence |
| 3 | 3.3 | Implement slot service and setup counts | dispatch | done | step-3.3-slot-service-and-setup-counts |
| 3 | 3.4 | Expose slot routes | dispatch | done | step-3.4-slot-routes |
| 3 | 3.5 | Build mentor slot management UI | dispatch | todo | — |
| 3 | 3.6 | Verify availability flows and document contracts | dispatch | todo | — |

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

## Risks

Concurrent slot publication and booked-slot withdrawal require database-level serialization; timestamps and browser time zones require explicit verification. The stacked base may change before merge.

## External References

No external skill URLs. Prototype: .ai/prototypes/discovery/mentor-onboarding/revision-002/.
