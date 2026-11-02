# MENTOR-003: removes bookability and offers Continue with Stripe when a ready mentor becomes past due, leaving a booked slot untouched

| Field | Value |
| ----- | ----- |
| Area | MENTOR |
| Priority | High |
| Type | UI |
| Requirement | [Mentor setup spec, MD7, Flow 3 item 9 "Regression and abandonment" and the "ready mentor has requirements due" edge case](../../specs/implemented/2026-10-18-mentor-setup.md): a sync that sees a restriction removes displayed bookability, offers **Continue with Stripe** for missing requirements, and leaves booked slots untouched; a ready account that becomes past due shows `incomplete`. |
| Implementation | [`stripe-readiness-loss.test.ts`](../../../packages/app/tests/integration/stripe-readiness-loss.test.ts), test: `Stripe readiness loss (browser) > removes bookability and offers Continue with Stripe when a ready mentor becomes past due, leaving a booked slot untouched` |
| Review | AI draft, awaiting human review |

## Scenario

```gherkin
Given a mentor whose Stripe payout account is provisioned and ready
And the mentor has one slot, which is now booked
And Mentor setup and the public profile show the mentor as bookable
When Stripe sends a signed account.updated webhook reporting a past-due requirement and payouts disabled
Then the stored payout status changes from ready to incomplete and the account stays provisioned and bound
And Mentor setup says "Not bookable yet: finish Stripe." and offers "Continue with Stripe"
And the public profile shows "Not taking bookings yet"
And the booked slot is still booked and listed as "Booked"
```

## Observed

- Before the webhook, `/mentor` shows "You are bookable." (one open slot) and `/mentors/<id>` has no "Not taking bookings yet" notice.
- The stub webhook is delivered to `/api/webhooks/stripe/connect` and answers 200. The handler re-fetches the account, so the stub account is changed first: `payouts_enabled` false, `transfers` inactive, `past_due` holds a document requirement, disabled reason `requirements.past_due`. The row becomes `incomplete`.
- `/mentor` then shows "Not bookable yet: finish Stripe." and the **Continue with Stripe** action; `/mentors/<id>` shows "Not taking bookings yet".
- `availability_slots.booked_at` is unchanged and `/mentor/slots` lists the slot as "Booked".
- The slot is booked by setting `booked_at` in the database, as `availability-slots.test.ts` does, because booking (E04) does not exist yet.

## Review flags

- **Open slots:** the spec only says booked slots are untouched. It does not say what happens to unbooked slots when bookability is lost, so this scenario does not assert it. Needs a decision.
- **Recovery:** the spec implies bookability returns once the mentor finishes ("lost until they finish"). That is a separate case and is not asserted here.

## Related cases

- [MENTOR-001](MENTOR-001-edit-profile-requires-an-area.md) and [MENTOR-002](MENTOR-002-slot-picked-in-mentor-time-zone-is-stored-and-shown-in-it.md) cover profile and slot input, not payout status.
- Not covered: `blocked` (rejected account: operator contact instead of **Continue with Stripe**), and the `pending` outcome.
