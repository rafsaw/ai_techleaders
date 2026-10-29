import { fixedClock, hashToken, type Clock } from "@devmentor/core";
import type { EntityManager } from "@mikro-orm/postgresql";
import { describe, expect, it, vi } from "vitest";

import { PostgresRateLimiter } from "./index";
import { DELETE_EXPIRED_BUCKETS_SQL, HIT_BUCKET_SQL } from "./rate-limiter";

const NOW = new Date("2026-10-28T12:00:00.000Z");
const RULE = { limit: 3, windowMs: 15 * 60_000 };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

type Bucket = { count: number; windowEndsAt: number };

/**
 * A mocked `em.execute` that applies the two statements to an in-memory table
 * the way PostgreSQL would, so tests observe the SQL's effect and its exact
 * parameters. The real-table behavior is proven against the migration in
 * integration (accounts Phase 2, Step 4).
 */
function mockEm(initial: Record<string, Bucket> = {}) {
  const table = new Map(Object.entries(initial));
  const execute = vi.fn(async (sql: string, params: unknown[], method: string) => {
    if (sql === DELETE_EXPIRED_BUCKETS_SQL) {
      expect(method).toBe("run");
      const now = Date.parse(params[0] as string);
      for (const [key, bucket] of table) if (bucket.windowEndsAt <= now) table.delete(key);
      return { affectedRows: 0 };
    }
    expect(sql).toBe(HIT_BUCKET_SQL);
    expect(method).toBe("all");
    const [, , updatedAt, keyHash, windowEndsAt] = params as string[];
    const now = Date.parse(updatedAt!);
    const existing = table.get(keyHash!);
    const next = !existing || existing.windowEndsAt <= now
      ? { count: 1, windowEndsAt: Date.parse(windowEndsAt!) }
      : { count: existing.count + 1, windowEndsAt: existing.windowEndsAt };
    table.set(keyHash!, next);
    return [{ count: next.count, window_ends_at_ms: String(next.windowEndsAt) }];
  });
  return { table, execute, em: { execute } as unknown as EntityManager };
}

function limiter(em: EntityManager, clock: Clock = fixedClock(NOW)) {
  return new PostgresRateLimiter({ em, clock });
}

const at = (ms: number) => fixedClock(NOW.getTime() + ms);

describe("PostgresRateLimiter", () => {
  it("allows attempts up to the limit, then refuses with the time left in the window", async () => {
    const { em, table } = mockEm();
    const results = [];
    for (const ms of [0, 1000, 2000, 3000, 4500]) results.push(await limiter(em, at(ms)).hit("sign-in:ip:203.0.113.7", RULE));
    expect(results).toEqual([
      { allowed: true, retryAfterMs: 0 },
      { allowed: true, retryAfterMs: 0 },
      { allowed: true, retryAfterMs: 0 },
      { allowed: false, retryAfterMs: RULE.windowMs - 3000 },
      { allowed: false, retryAfterMs: RULE.windowMs - 4500 },
    ]);
    // Refused attempts still count.
    expect(table.get(hashToken("sign-in:ip:203.0.113.7"))).toEqual({ count: 5, windowEndsAt: NOW.getTime() + RULE.windowMs });
  });

  it("starts a fresh window once window_ends_at has passed", async () => {
    const { em } = mockEm();
    for (let i = 0; i < 4; i += 1) await limiter(em).hit("k", RULE);
    expect(await limiter(em, at(RULE.windowMs - 1)).hit("k", RULE)).toEqual({ allowed: false, retryAfterMs: 1 });
    expect(await limiter(em, at(RULE.windowMs)).hit("k", RULE)).toEqual({ allowed: true, retryAfterMs: 0 });
  });

  it("restarts an expired window inline when the upsert finds one", async () => {
    // The cleanup did not remove it (simulated by a delete that matches nothing).
    const { execute, table } = mockEm({ [hashToken("k")]: { count: 9, windowEndsAt: NOW.getTime() } });
    const upsertOnly = vi.fn(async (sql: string, params: unknown[], method: string) =>
      sql === DELETE_EXPIRED_BUCKETS_SQL ? { affectedRows: 0 } : execute(sql, params, method));
    const result = await limiter({ execute: upsertOnly } as unknown as EntityManager).hit("k", RULE);
    expect(result).toEqual({ allowed: true, retryAfterMs: 0 });
    expect(table.get(hashToken("k"))).toEqual({ count: 1, windowEndsAt: NOW.getTime() + RULE.windowMs });
  });

  it("keeps separate keys apart and stores only their hashes", async () => {
    const { em, table } = mockEm();
    await limiter(em).hit("sign-in:email:a@example.com", { limit: 1, windowMs: 1000 });
    expect(await limiter(em).hit("sign-in:email:b@example.com", { limit: 1, windowMs: 1000 })).toMatchObject({ allowed: true });
    expect([...table.keys()]).toEqual([hashToken("sign-in:email:a@example.com"), hashToken("sign-in:email:b@example.com")]);
    for (const key of table.keys()) expect(key).toMatch(/^[0-9a-f]{64}$/);
  });

  it("deletes expired buckets first, including keys never hit again, and keeps active ones", async () => {
    const { em, table } = mockEm({
      stale: { count: 2, windowEndsAt: NOW.getTime() - 1 },
      endsNow: { count: 2, windowEndsAt: NOW.getTime() },
      active: { count: 2, windowEndsAt: NOW.getTime() + 1 },
    });
    await limiter(em).hit("other", RULE);
    expect([...table.keys()].sort()).toEqual(["active", hashToken("other")].sort());
    expect(table.get("active")).toEqual({ count: 2, windowEndsAt: NOW.getTime() + 1 });
  });

  it("runs the cleanup before the upsert with one clock value and no SQL now()", async () => {
    const { em, execute } = mockEm();
    const clock = { now: vi.fn(() => new Date(NOW)) };
    await limiter(em, clock).hit("k", RULE);
    expect(clock.now).toHaveBeenCalledTimes(1);
    expect(execute.mock.calls).toEqual([
      [DELETE_EXPIRED_BUCKETS_SQL, [NOW.toISOString()], "run"],
      [HIT_BUCKET_SQL, [expect.stringMatching(UUID), NOW.toISOString(), NOW.toISOString(), hashToken("k"),
        new Date(NOW.getTime() + RULE.windowMs).toISOString()], "all"],
    ]);
    expect(execute.mock.calls[0]![1]).not.toBe(execute.mock.calls[1]![1]);
  });

  it("issues an indexed cleanup and an atomic upsert on the key hash", () => {
    expect(DELETE_EXPIRED_BUCKETS_SQL).toBe('delete from "rate_limit_buckets" where "window_ends_at" <= ?::timestamptz');
    expect(HIT_BUCKET_SQL).toMatch(/^insert into "rate_limit_buckets" \("id", "created_at", "updated_at", "key_hash", "count", "window_ends_at"\)/);
    expect(HIT_BUCKET_SQL).toContain('on conflict ("key_hash") do update set');
    expect(HIT_BUCKET_SQL).toContain('"rate_limit_buckets"."count" + 1');
    expect(HIT_BUCKET_SQL).toContain('then excluded."window_ends_at"');
    expect(HIT_BUCKET_SQL).toMatch(/returning "count", .* as "window_ends_at_ms"$/);
    expect(`${DELETE_EXPIRED_BUCKETS_SQL}\n${HIT_BUCKET_SQL}`).not.toMatch(/now\(\)|current_timestamp/i);
    expect(HIT_BUCKET_SQL.match(/\?/g)).toHaveLength(5);
  });

  it("generates a new row id for every hit", async () => {
    const { em, execute } = mockEm();
    await limiter(em).hit("k", RULE);
    await limiter(em).hit("k", RULE);
    expect(execute.mock.calls[1]![1]![0]).not.toBe(execute.mock.calls[3]![1]![0]);
  });

  it("fails loudly if the upsert returns no row", async () => {
    const execute = vi.fn().mockResolvedValueOnce({ affectedRows: 0 }).mockResolvedValueOnce([]);
    await expect(limiter({ execute } as unknown as EntityManager).hit("k", RULE)).rejects.toThrow("rate limiter upsert returned no row");
  });

  it.each([
    [{ limit: 0, windowMs: 1000 }, "limit"],
    [{ limit: 1.5, windowMs: 1000 }, "limit"],
    [{ limit: Number.NaN, windowMs: 1000 }, "limit"],
    [{ limit: 1, windowMs: 0 }, "windowMs"],
    [{ limit: 1, windowMs: Number.POSITIVE_INFINITY }, "windowMs"],
  ])("rejects an invalid rule %o before touching the database", async (rule, field) => {
    const { em, execute } = mockEm();
    await expect(limiter(em).hit("k", rule)).rejects.toThrow(new RangeError(`rate limit needs a positive integer ${field}`));
    expect(execute).not.toHaveBeenCalled();
  });
});
