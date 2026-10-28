# 2026-10-28 — E01 Phase 2 step 2.3: rate limiter (P11)

**Asked:** implement accounts Phase 2 step 3 only: the P11 `RateLimiter` port with the Postgres adapter, `TooManyRequestsError` (429 + `Retry-After`), `clientIp`, and `config.app().trustProxy` (`TRUST_PROXY`, default `false`). No migration (Step 4) and no business rules or route usage (Step 5).

**Done:**

- `core/src/security/rate-limiter.ts`: `RateLimiter`, `RateLimitRule`, `RateLimitResult` (types only).
- `core/src/http/client-ip.ts`: `clientIp(req, { trustProxy })`; one `isIP` address from `X-Forwarded-For` only when trusted, else `null`; lists, ports, brackets, zone ids, malformed or missing → `null`; IPv6 lowercased.
- `core/src/http/errors.ts`: `TooManyRequestsError(retryAfterMs?, message)`, `rate_limited`, 429. `apiHandler` sets `Retry-After` (seconds, ceil, ≥ 1) for a 429 with a finite `retryAfterMs`; envelope unchanged.
- `db/src/entities/security/rate-limit-bucket.entity.ts` (`RateLimitBucket`: `baseProperties`, `key_hash char(64) unique`, `count int`, `window_ends_at timestamptz` indexed), listed in `entities`.
- `db/src/rate-limiter.ts`: `PostgresRateLimiter({ em, clock })`, exported from `@devmentor/db`; cleanup `DELETE` then atomic upsert, one `clock.now()`, key stored as `hashToken(key)`.
- `rateLimiter` registered TRANSIENT in `container.ts`, typed in `cradle.ts`; `TRUST_PROXY` in `config.ts`, `.env.example`, README.
- Tests: `client-ip.test.ts`, `rate-limiter.test.ts` (mocked `execute` applying the statements to an in-memory table), 429 cases in `http.test.ts`, entity metadata, config parsing, container registration.

**Decisions:**

- The port has no rule id, so callers put it in the key; the adapter hashes the whole key. Rule constants are left to Step 5.
- Entity before migration: nothing reads `rate_limit_buckets` yet and MikroORM does no schema validation at boot, so no workaround was needed. There is no schema-vs-migration check test; `db/src/config.test.ts` asserted `entities` had length 3 and now asserts the entity names.
- Window end returned as epoch ms because raw rows carry `timestamptz` as text (lesson added).
- The SQL was verified by hand against a throwaway `postgres:17-alpine` container (increment, refusal with `retryAfterMs`, cleanup of an expired never-reused key, inline restart branch). **The committed real-PostgreSQL test of the limiter ships with the Step 4 migration.**

**Gate:** `npm run lint` (0 errors; 1 pre-existing warning in `.agents/skills`), `npm run typecheck`, `npm run test:coverage` (73 files, 1163 tests, 100% statements/branches/functions/lines), `npm run build`, `npm run test:integration` (3 files, 31 tests).

**Outcome:** success.
