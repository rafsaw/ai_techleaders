# Hardcoded colours to tokens in packages/app/src

- Request: replace hardcoded values in `packages/app/src` with tokens from
  `packages/ui/src/styles/globals.css`; list, propose, wait for approval, then change only the
  affected files and the token file.
- Approved by Rafał (2026-10-21): the whole mapping, including `text-neutral-600` →
  `text-muted-foreground`; new `grid-cols-content-aside` with `minmax(0, 1fr)`; no size/role
  changes (recorded in `packages/ui/POSTEP.md`, "Do zrobienia poza design systemem").
- Status: success. Nothing committed.

## Changes

| File | Change |
|---|---|
| `packages/app/src/app/(frontend)/page.tsx` | `text-neutral-500/600` → `text-muted-foreground`; `text-neutral-950` → `text-foreground`; `bg-neutral-950 text-white` → `bg-primary text-primary-foreground`; `hover:bg-neutral-800` → `hover:bg-primary/90` |
| `packages/app/src/app/backend/users/users-panel.tsx` | `lg:grid-cols-[1fr_20rem]` → `lg:grid-cols-content-aside` |
| `packages/ui/src/styles/globals.css` | new `@utility grid-cols-content-aside` |
| `packages/ui/POSTEP.md` | two items in "Do zrobienia poza design systemem" (raw size/radius classes on home; favicon) |

No new colour token was needed, so no contrast was calculated.

## Favicon (described, not changed)

- Where: `packages/app/src/app/layout.tsx:14`, `metadata.icons.icon`, a URL-encoded
  `data:image/svg+xml,…` string. Its colours: `#1B1B1B`, `#B4F372`, `#EEFB63`, `#BC9AFF`
  (`lekcja-06/audyt.md` l. 82–84). There is also `packages/app/src/app/favicon.ico`
  (Next file convention); the built `index.html` has both `<link rel="icon">` tags.
- Why the first list missed it: the search pattern looked for a literal `#` before hex digits, but
  inside the data URI the `#` is percent-encoded as `%23` (`fill%3D'%231B1B1B'`,
  `stop-color%3D'%23B4F372'`). The `.ts`/`.tsx` scan also matched no `rgb(`/`oklch(` there. The
  string is one 3 KB line, so it never showed up as a hit. The same scan did not look for
  `%23`-encoded values; it should have.
- It is a template leftover (gradient named `sandboxesMark`); it needs an approved DevMentor mark,
  a product decision, so it was left alone.

## Gate

`npm run lint`, `typecheck`, `test:coverage` (30 files, 278 tests, 100% per-file thresholds) and
`build` all passed. `test:integration` was not run (not requested; needs Docker).
