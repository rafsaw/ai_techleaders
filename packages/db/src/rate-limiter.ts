import { randomUUID } from "node:crypto";

import { hashToken, type Clock, type RateLimiter, type RateLimitResult, type RateLimitRule } from "@devmentor/core";
import type { EntityManager } from "@mikro-orm/postgresql";

/** Removes every expired bucket, through the `window_ends_at` index, including keys never hit again. */
export const DELETE_EXPIRED_BUCKETS_SQL =
  'delete from "rate_limit_buckets" where "window_ends_at" <= ?::timestamptz';

/**
 * Counts one attempt atomically. A new key starts a window of one attempt; an
 * existing one is incremented, or restarted inline if its window has ended
 * (a row the cleanup did not see, e.g. inserted by a concurrent hit).
 * `excluded."updated_at"` is this hit's `now`, so both statements compare
 * against the same `clock.now()` value and never SQL `now()` (platform P2).
 */
export const HIT_BUCKET_SQL = `insert into "rate_limit_buckets" ("id", "created_at", "updated_at", "key_hash", "count", "window_ends_at")
values (?, ?::timestamptz, ?::timestamptz, ?, 1, ?::timestamptz)
on conflict ("key_hash") do update set
  "count" = case when "rate_limit_buckets"."window_ends_at" <= excluded."updated_at" then 1 else "rate_limit_buckets"."count" + 1 end,
  "window_ends_at" = case when "rate_limit_buckets"."window_ends_at" <= excluded."updated_at" then excluded."window_ends_at" else "rate_limit_buckets"."window_ends_at" end,
  "updated_at" = excluded."updated_at"
returning "count", (extract(epoch from "window_ends_at") * 1000)::bigint as "window_ends_at_ms"`;

/** The driver returns `bigint` as a string; epoch milliseconds avoid parsing Postgres timestamp text. */
type BucketRow = { count: number; window_ends_at_ms: string };

function assertRule({ limit, windowMs }: RateLimitRule): void {
  if (!Number.isSafeInteger(limit) || limit < 1) throw new RangeError("rate limit needs a positive integer limit");
  if (!Number.isSafeInteger(windowMs) || windowMs < 1) throw new RangeError("rate limit needs a positive integer windowMs");
}

/**
 * The `RateLimiter` port on the `rate_limit_buckets` table (platform P11), so
 * counts are shared by every app instance. Each `hit` runs two statements on
 * the scoped `em` (inside the caller's transaction if there is one, though
 * callers hit the limiter before opening theirs): the expired-bucket cleanup,
 * then the upsert. Keys are stored as `hashToken(key)`, never raw.
 */
export class PostgresRateLimiter implements RateLimiter {
  readonly #em: EntityManager;
  readonly #clock: Clock;

  constructor({ em, clock }: { em: EntityManager; clock: Clock }) {
    this.#em = em;
    this.#clock = clock;
  }

  async hit(key: string, rule: RateLimitRule): Promise<RateLimitResult> {
    assertRule(rule);
    const now = this.#clock.now();
    const nowIso = now.toISOString();
    const windowEndsAt = new Date(now.getTime() + rule.windowMs).toISOString();

    await this.#em.execute(DELETE_EXPIRED_BUCKETS_SQL, [nowIso], "run");
    const [row] = await this.#em.execute<BucketRow[]>(
      HIT_BUCKET_SQL,
      [randomUUID(), nowIso, nowIso, hashToken(key), windowEndsAt],
      "all",
    );
    if (!row) throw new Error("rate limiter upsert returned no row");

    if (row.count <= rule.limit) return { allowed: true, retryAfterMs: 0 };
    return { allowed: false, retryAfterMs: Math.max(0, Number(row.window_ends_at_ms) - now.getTime()) };
  }
}
