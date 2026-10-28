# 2026-10-28 — E01 Phase 1 re-review fixes R5 and R6 (welcome flag)

## Asked

A Codex re-review of the R4 change (commit `9f5c6c5`, welcome notice on every safe `returnTo`)
found two Major issues. Reproduce each with a failing test, fix, commit each separately, run the
full gate, write this log. Stay in Phase 1 of `.ai/specs/2026-10-17-accounts-and-roles.md`; do not
edit `track.md`; do not push.

## Done

| Task | Root cause | Fix | Commit |
|---|---|---|---|
| R5 | `/account` rendered `<ForgetWelcome path="/account" />`, which `replaceState`d to exactly `/account`. A new account landing on `/account?tab=x&welcome=1#top` lost `tab=x` and `#top` too. | New shared client helper `dropWelcomeFlag()` (`packages/app/src/app/drop-welcome-flag.ts`) removes only `welcome`, keeping other params, the hash and `history.state`. Used by `ForgetWelcome` (no `path` prop any more) and `AppWelcomeNotice` (its private `addressWithoutWelcome` removed). | `f8223cc` |
| R6 | User `returnTo` is validated at ≤ 512 characters; `withWelcome` then adds `welcome=1` (+10, more if `URLSearchParams` re-encodes the query) and `navigationHandler` re-validated the server-built target with the same 512 bound, so every `returnTo` ≥ 503 characters fell back to `/`. Same cause, latent twin: a failed callback's `/sign-in?error=…&returnTo=…` re-encodes the `returnTo` (up to 3×) and also fell back to `/`. | `parseInternalRedirect` in `return-to.schema.ts`: the identical P6 rules (shared private `parsePagePath`) with `INTERNAL_REDIRECT_MAX_LENGTH = 2048`; `navigationHandler` uses it for internal success and error targets. `parseReturnTo`/`returnToSchema` keep 512 for all user input. Spec notes: platform P6/P7, accounts SM-AC7 implementation note. | `7885381` |

Reproduction: R5 — the `ForgetWelcome` unit test with `/account?tab=x&welcome=1#top` failed
before the fix. R6 — eight new callback-route tests (real `GitHubSignInService` + real
`navigationHandler`) all redirected to `https://devmentor.example/` before the fix.

## Decisions (R6)

- (a) drop the flag when it would exceed 512: keeps the destination, loses the SM-AC7 notice in
  that rare case. Simple, but SM-AC7 says the notice appears on the `returnTo` page.
- (b) **chosen**: keep 512 for user-supplied input; give server-built redirect targets a larger
  bound with the same safety rules. Keeps destination and notice; same-origin page path, no
  `/api`, `/_next`, `//`, safe decoding and normalization are unchanged (tested by running the
  whole `unsafe` and `allowed` tables through both functions). 2048 covers a 512-character
  `returnTo` plus the flag and its worst-case re-encoding inside the error page query
  (~41 + 3 × 512 = 1577). It also fixes the latent error-page loss for free.
- (c) reserve room at sign-in begin (validate at 502): rejects `returnTo` values valid today, so it
  loses destinations. Rejected.
- `withWelcome` left as is (still `URLSearchParams.set`); the 2048 bound absorbs its re-encoding.

## Tests added

- `packages/app/src/app/drop-welcome-flag.test.tsx` (6), `ForgetWelcome` regression and an
  `/account` page regression in `packages/app/src/app/(app)/app.test.tsx`.
- Integration: new stub account signs in with `returnTo=/account?tab=x#top` → after the notice the
  URL is `/account?tab=x#top` (`packages/app/tests/integration/app.test.ts`).
- `packages/app/src/app/api/auth/github/route.test.ts`: new account with 503/507/511/512-character
  `returnTo` (no query → `?welcome=1`), 503/512 with a query (→ `&welcome=1`), a 512-character
  query that grows most when re-encoded, and the cancelled-sign-in error page keeping a
  512-character `returnTo`.
- `return-to.schema.test.ts`: `parseInternalRedirect` rejects every unsafe case, accepts every
  allowed case, accepts the >512 cases `parseReturnTo` rejects, 2048 accepted / 2049 and
  encoded-growth rejected, long reserved/protocol-relative still rejected.
- `navigationHandler.test.ts`: keeps a 522-character target; falls back to `/` above 2048.

## Gate (final tree)

- `npm run lint`: 0 errors (1 pre-existing warning in `.agents/skills/om-share-this-session/…`)
- `npm run typecheck`: pass
- `npm run test:coverage`: 66 files, 1079 tests, 100% statements/branches/functions/lines (per file)
- `npm run build`: pass
- `npm run test:integration`: 30/30 (24 app + 6 migrations)
- `npm run test:storybook`: not run, `packages/ui` unchanged

## Outcome

Success. Both issues fixed, gate green, not pushed.
