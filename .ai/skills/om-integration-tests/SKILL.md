# om-integration-tests: DevMentor project overrides

Apply these on top of the base om-integration-tests skill. Everything not mentioned here stays as in the base skill. Repo mechanics (runner, helpers, cleanup, rate limits) are in `packages/app/tests/integration/AGENTS.md`.

## Scenario file: mandatory

This replaces base step 8 and the base rule that the markdown scenario is optional. Every test case you author gets a scenario file, in interactive and autonomous runs alike. A task that authors a test is not done without it.

- **Path:** `.ai/qa/{AREA}/{AREA}-{number}-{slug}.md`, for example `.ai/qa/MENTOR/MENTOR-001-rejects-profile-without-price.md`.
- **`{AREA}`:** the uppercase domain area, `^[A-Z][A-Z0-9]*$`. Reuse an existing `.ai/qa/{AREA}/` directory when one fits.
- **`{number}`:** three digits, sequential per area: the highest number in that directory plus one. Never reuse a number, even after deleting a scenario.
- **`{slug}`:** kebab-case summary of the condition and result.
- **Test ID:** `{AREA}-{number}` replaces the `TC-{CATEGORY}-{NNN}` fallback from base step 5.
- **One to one:** one scenario file describes exactly one `it` case. Test files here group several `it` cases by feature, so apply the base "one scenario per test file" rule per `it`, and add to the feature's existing test file when it already has the fixtures.
- **Changing a test:** update its scenario in the same change. If an edited test has no scenario, add one. If you delete a test, delete its scenario, so no link goes dead.
- **Running-only mode** writes no scenarios.

Write the file in step 8, then fill in **Observed** and **Implementation** once the test passes in step 9. Use this template:

````markdown
# {AREA}-{number}: {test title}

| Field | Value |
| ----- | ----- |
| Area | {AREA} |
| Priority | High / Medium / Low |
| Type | UI / API / DB |
| Requirement | [spec, section or issue](relative/path) |
| Implementation | [`{file}.test.ts`](../../../packages/app/tests/integration/{file}.test.ts), test: `{exact describe > it title}` |
| Review | AI draft, awaiting human review |

## Scenario

```gherkin
Given ...
When ...
Then ...
```

## Observed

What the running app actually did at each step: routes, labels, messages, statuses.

## Related cases

Links to sibling scenarios for the same feature.
````

Before finishing, check each scenario you wrote:

1. The **Implementation** link is relative and resolves to a real TypeScript test file.
2. `grep -F` finds the exact `it` title in that file.
3. The file contains no password, token, raw invitation link or real personal data.

Only a human changes **Review** to `reviewed`.

## Integration test practices

**Mandatory reference:** read `.ai/skills/om-integration-tests/references/best-practices-testow-integracyjnych.md` before writing any scenario or test, and apply all 15 practices. They add to the base rules. The path is from the repo root, because the base skill's `references/` is a different directory.

The practices' examples use Playwright. Here, apply them through the repo's runner and helpers:

- **Waiting (practice 4):** wait for a concrete state with `waitForText`, `waitForMessageTo` or `waitForLockWaiters`.
- **Random values (practice 4):** allowed only to keep fixtures unique (the email suffix). No result may depend on the value.
- **Setup (practice 6):** `operator` is granted with the real CLI, never by writing the role row.
- **External integrations (practice 8):** use `github-stub.ts`, `stripe-stub.ts` and Mailpit.
- **Case coverage (practice 9):** each case that applies is its own scenario. The final report lists every case type as covered or not applicable, with a reason.
- **Selectors (practice 11):** reuse the `IntegrationBrowser` helpers.

Practice 15 sets the source of expected results:

- Take **Then** from the spec, issue or the user's description, and link it under **Requirement**.
- Selectors, steps and **Observed** come from exploring the app, as in the base skill.
- If the app contradicts the requirement, report a product regression. Never rewrite **Then** or weaken an assertion to match what the app does.
- If no source defines the expected result, ask the user. In an unattended run, write `Requirement: none, needs confirmation` and flag it in the final report.
- Every generated scenario stays `AI draft` until a human reviews it. List the scenarios to review in the final report.
