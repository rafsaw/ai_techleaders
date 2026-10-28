# 2026-10-28 — E01 Phase 2 review fixes (Codex REQUEST CHANGES)

## Asked

An independent Codex review of Phase 2 returned REQUEST CHANGES with two Major issues. Verify
and fix both with subagents, reproducing each with regression tests first; then run the full
Phase 2 gate, update `track.md` and record the results. Stay in Phase 2.

## Done (two subagents in parallel on disjoint files; gate run once afterwards)

| Task | Issue | Outcome | Commit |
|---|---|---|---|
| R7 | `/confirm-email` had no `noindex` | Confirmed: only the referrer protection existed; no robots meta, no `X-Robots-Tag`, and no `Cache-Control: private, no-store` (spec line 141, platform P8). 3 new tests failed first. Shared `TOKEN_PAGE_METADATA` / `TOKEN_PAGE_HEADERS` (`packages/app/src/app/token-page.ts`), reused by Phase 3's invite page; next.config's `Cache-Control` is kept by Next in production (dev forces `no-store`). Integration check of headers and meta on the real build. | `23fc68e` |
| R8 | `clientIp` did not canonicalize IPv6 | Confirmed: 15 new tests failed first. IPv6 is canonicalized through WHATWG URL (RFC 5952 form) and `::ffff:0:0/96` is returned as dotted IPv4, so equivalent spellings share one rate-limit bucket. Contract unchanged. Follow-up idea (spec change, not done): key IPv6 per-IP rules by /64. | `42884f1` |

## Gate (final tree)

- `npm run lint`: 0 errors (1 pre-existing warning in `.agents/skills/om-share-this-session/…`)
- `npm run typecheck`: pass
- `npm run test:coverage`: 88 files, 1702 tests, 100% per file
- `npm run build`: pass
- `npm run test:integration`: 6 files, 54 tests (incl. the new R7 header/meta assertions)
- `npm run test:storybook`: 56 files, 340 tests

## Outcome

Success: R7 and R8 fixed and verified. Phase 3 not started.
