# om-code-review: DevMentor project overrides

Apply these on top of the base om-code-review skill. Everything not mentioned here stays as in the base skill.

## Extra rule: changes to agent instruction files

If the PR changes `AGENTS.md` or `CLAUDE.md`, add a report section **"🤖 Agent instruction changes"** right after Findings. For each changed file list:
- what changed, in one line per change,
- whether the change fits the PR scope (yes / no, with a reason),
- a finding (Minor or higher) if it does not fit the scope or contradicts other rules in the repo.

If neither file changed, write one line: "No changes to agent instruction files."

## Extra report section: manual checks

At the end of the report, before any closing question, add a section **"🖐️ Manual checks"** with at most 5 concrete things a human should verify by hand that the validation gate and automated tests do not cover. For each one give the exact command or steps and the expected result.
