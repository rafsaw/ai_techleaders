# MENTOR-001: refuses to save an edited profile without an area, then saves it once an area is chosen

| Field | Value |
| ----- | ----- |
| Area | MENTOR |
| Priority | Medium |
| Type | UI |
| Requirement | [Mentor setup spec, MD3 and the profile field table](../../specs/implemented/2026-10-18-mentor-setup.md): exactly one area, one of TypeScript, React or Python. The request asked for "at least one technology"; the spec allows exactly one, and this scenario checks only what both agree on: no area, no save. |
| Implementation | [`mentor-profile-area-ui.test.ts`](../../../packages/app/tests/integration/mentor-profile-area-ui.test.ts), test: `mentor profile area (browser) > refuses to save an edited profile without an area, then saves it once an area is chosen` |
| Review | AI draft, awaiting human review |

## Scenario

```gherkin
Given a mentor whose profile is published with the area TypeScript
And the mentor is signed in and opens "Edit profile" from Mentor setup
When the mentor sets Area back to "Choose an area" and clicks "Save"
Then the Area field shows the error "Choose an area"
And the mentor stays on the profile form
And the stored profile is unchanged
When the mentor chooses React and clicks "Save"
Then the mentor returns to Mentor setup
And the stored profile and the public page show React instead of TypeScript
```

## Observed

- `/mentor` shows the link **Edit profile** only after a profile is saved. Without a profile the link is **Create your profile** and the form heading matches it.
- **Area** is a single select (`combobox "Area"`). Its empty option is labelled "Choose an area", the same text as the error, so the test checks the `alert` under the field and that it is absent before saving.
- After **Save** with no area, the select is marked invalid, the `alert` reads "Choose an area", and the URL stays `/mentor/profile`. The form validates in the browser, so no request reaches the API.
- After choosing React and saving, the browser goes to `/mentor`, and `/mentors/<id>` shows "React".

## Related cases

None yet. Not covered: the API refusing a missing or empty `area` (400 with `fieldErrors.area`). The browser never sends that request, so only an API scenario can check it.
