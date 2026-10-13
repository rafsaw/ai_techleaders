<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Spec-Driven Development (SDD) & agent metadata

This project uses a `.ai/` folder as the source of truth for specs, run logs,
and lessons learned. Every agent (human-directed or autonomous) working in
this repo MUST follow this structure — do not improvise alternative
locations for specs, logs, or notes.

## `.ai/specs/` — specifications

- Every feature/change that goes through SDD gets a spec file named
  `YYYY-MM-DD-slug.md` (date the spec was created, kebab-case slug).
- New specs are written directly in `.ai/specs/`.
- Once a spec has been fully implemented, move the file into
  `.ai/specs/implemented/` (keep the original filename — don't rename or
  change the date).
- If a spec is abandoned, superseded, or no longer relevant, move it into
  `.ai/specs/archive/` instead of deleting it.
- Before starting implementation work, check `.ai/specs/` for an existing
  spec covering the task. If none exists and the task is non-trivial, write
  one first and get it reviewed before coding.

## `.ai/runs/` — autonomous run logs

- Every autonomous AI run (unattended / agentic execution, not a normal
  interactive session) writes a log file to `.ai/runs/` named
  `YYYY-MM-DD-slug.md` (date the run started, kebab-case slug describing the
  task).
- The log should capture: what the run was asked to do, what it did, key
  decisions, and the outcome (success/failure/partial).
- Do not overwrite or delete past run logs. If a run is retried, use a new
  slug (or append `-2`, `-3`, ...) rather than clobbering the original file.

## `.ai/lessons.md` + `.ai/lessons/` — long-term memory

- `.ai/lessons.md` is the append-only index of lessons learned: gotchas,
  bug-fix root causes, and improvements worth remembering across sessions.
- After fixing a non-trivial bug, or whenever you discover something future
  agents should know, add an entry to `.ai/lessons.md` using the template at
  the top of that file.
- If a lesson is substantial enough to warrant a full write-up, create
  `.ai/lessons/YYYY-MM-DD-slug.md` and link it from `.ai/lessons.md` instead
  of inlining the whole thing.
- Never delete lessons. If a lesson becomes outdated, mark it as superseded
  inline rather than removing it.
- Check `.ai/lessons.md` before starting non-trivial work, especially in
  areas with a history of bugs — a relevant lesson may already exist.

## Naming rules (applies to all of the above)

- Format: `YYYY-MM-DD-slug.md`, date first, then a short kebab-case slug.
- Use the date the file was created/the run started — never update it later.
- Slugs should be short and descriptive (e.g. `2026-10-13-auth-session-fix.md`).

# Working rules (distilled from Boris Cherny's Claude Code tips)

Source: https://ykdojo.github.io/claude-code-tips/content/boris-claude-code-tips

1. **Plan before you build. If it goes wrong, plan again.** Start non-trivial
   work in plan mode or with a spec in `.ai/specs/`. Make the plan detailed
   enough that the implementation can be done in one pass. If the
   implementation goes off track, stop and update the plan instead of piling
   patches on top.
2. **Turn every correction into a rule.** When a human corrects you, write a
   lesson to `.ai/lessons.md` (or update this file if it's a standing
   convention) so the same mistake doesn't come back. Keep rules short and
   specific, and refine them until the mistake actually stops happening.
3. **Fix things yourself and prove they work.** When you're given a bug
   report, a failing test, or a CI failure, find the root cause and fix it
   without waiting for step-by-step instructions. Before you say it's done,
   run the relevant tests, lint, and build. Ask for review only after the
   checks pass.
4. **Prefer the elegant fix over the first one that works.** If a fix feels
   hacky, throw it out and rewrite it cleanly using what you've learned.
   Specific specs and prompts produce better output than vague ones.
5. **Use subagents, and turn repeated work into reusable tools.** Hand off
   research, exploration, and parallel subtasks to subagents so the main
   context stays focused. Anything you do more than once a day should become
   a skill or slash command and be committed to git.
