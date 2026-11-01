# Phase 2: Stripe onboarding

Base: PR #62 (`feat/mentor-profile-setup`). Story: #38; epic: #29. Status: in-progress.

## Tasks

| Phase | Step | Title | Exec | Status | Commit |
| --- | --- | --- | --- | --- | --- |
| 2 | 2.1 | Configuration, port and validation | dispatch (economy) | done | 09b119d (after 435343e) |
| 2 | 2.2 | Stripe adapter and security review | inline | done | ab33cc7 |
| 2 | 2.2-review-fix | Reject malformed signed account events | inline | done | e0835d7 |
| 2 | 2.3 | Payout schema and migration | dispatch (economy) | done | this commit |
| 2 | 2.4 | Signature-only webhook handler | inline | done | 3575aab |
| 2 | 2.4-review-fix | Remove webhook test lint warnings | inline | done | 4530f79 |
| 2 | 2.10 | Onboarding service | inline | done | 79b4a8c |
| 2 | 2.5 | Onboarding and webhook routes | inline | done | 34b22fe |
| 2 | 2.11 | Bookability and setup state | inline | done | this commit |
| 2 | 2.6 | Setup UI using approved prototype and Storybook | dispatch (standard) | todo | — |
| 2 | 2.7 | Stripe stub and integration scenarios | dispatch (standard) | todo | — |
| 2 | 2.8 | Documentation and specification updates | dispatch (economy) | todo | — |
| 2 | 2.9 | Manual US and PL Stripe test-mode acceptance | inline | todo | — |

## Scope and risks

Implement Phase 2 of `.ai/specs/2026-10-18-mentor-setup.md` on PR #62. Preserve Phase 1 behavior and exclude slots and checkout. Test recovery, concurrency, signatures and authorization. A real Stripe test-mode run for both countries is mandatory; availability of credentials and interactive verification remains unconfirmed. Risk-high requires a second reviewer. The stacked base must be reconciled when PR #62 merges.
