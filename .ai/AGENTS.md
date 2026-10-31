# `.ai/`: specs, run logs, lessons

## `specs/`

- Every feature/change that goes through SDD gets a spec file, written directly
  in `.ai/specs/`.
- Once a spec has been fully implemented, move the file into
  `.ai/specs/implemented/` (keep the original filename — don't rename or
  change the date).
- If a spec is abandoned, superseded, or no longer relevant, move it into
  `.ai/specs/archive/` instead of deleting it.

## `runs/`

- Every autonomous AI run (unattended / agentic execution, not a normal
  interactive session) writes a log file to `.ai/runs/`.
- The log should capture: what the run was asked to do, what it did, key
  decisions, and the outcome (success/failure/partial).
- Do not overwrite or delete past run logs. If a run is retried, use a new
  slug (or append `-2`, `-3`, ...) rather than clobbering the original file.

## `lessons.md`

- `.ai/lessons.md` is the append-only index of lessons learned: gotchas,
  bug-fix root causes, and improvements worth remembering across sessions.
- After fixing a non-trivial bug, or whenever you discover something future
  agents should know, add an entry to `.ai/lessons.md` using the template at
  the top of that file.

## Naming rules (applies to all of the above)

- Format: `YYYY-MM-DD-slug.md`, date first, then a short kebab-case slug.
- Use the date the file was created/the run started — never update it later.
