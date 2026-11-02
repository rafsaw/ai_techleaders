# MENTOR-002: stores a slot picked in the mentor's zone as the matching UTC instant and shows it back in that zone

| Field | Value |
| ----- | ----- |
| Area | MENTOR |
| Priority | High |
| Type | UI |
| Requirement | [Mentor setup spec, MD6 and Flow 4](../../specs/implemented/2026-10-18-mentor-setup.md): instants are stored as UTC `timestamptz`; the mentor enters times in their browser's time zone; every viewer sees times in their own browser's zone, with that zone named; the form is labelled "Start time (your time zone: …)". |
| Implementation | [`mentor-slot-time-zone-ui.test.ts`](../../../packages/app/tests/integration/mentor-slot-time-zone-ui.test.ts), test: `mentor slot time zone (browser) > stores a slot picked in the mentor's zone as the matching UTC instant and shows it back in that zone` |
| Review | AI draft, awaiting human review |

## Scenario

```gherkin
Given a signed-in mentor with a saved profile and no upcoming slots
And the mentor's browser time zone is Pacific/Auckland (UTC+12 or +13, never UTC)
When the mentor enters 10:30 on a day ten days ahead in "Start time" and clicks "Publish slot"
Then the stored slot start is the UTC instant at which Auckland's clock reads 10:30 that day
And the slot row shows that start as 10:30 AM with the GMT+12 or GMT+13 zone name
And after reloading /mentor/slots the row shows the same local time and the same instant
```

## Observed

- `/mentor/slots` with no slots shows "No upcoming slots". The field label reads "Start time (your time zone: Pacific/Auckland)" once the browser's `TZ` is set when its session starts.
- The `datetime-local` input takes the wall time `YYYY-MM-DDT10:30`. **Publish slot** sends it as an ISO UTC instant, and the row appears with the state "Open".
- `availability_slots.starts_at` holds one row for the mentor's profile, equal to the independently computed UTC instant (for example 21:30Z the previous day during NZDT).
- The row's `<time datetime>` attribute equals the stored instant. Its text is the viewer-zone rendering "…, 10:30 AM GMT+13" (GMT+12 outside daylight saving), right after publishing and after a reload.
- The day is ten days ahead and 10:30 is mid-morning, so the time is past the two-hour lead time and clear of a daylight-saving changeover.

## Related cases

- [MENTOR-001](MENTOR-001-edit-profile-requires-an-area.md): the profile form on the same Mentor setup flow.
- `availability-slots.test.ts` (no scenario file yet) covers lead time, conflicts, withdrawal, booked state and privacy in the host's zone. It does not check the stored instant.
- Not covered: a viewer in a different zone than the mentor seeing the same instant. Only the mentor's own page shows slots until the mentee slot picker (E04) exists. Also not covered: a nonexistent local time at a daylight-saving gap (unit-tested by `isExistingLocalTime`).
