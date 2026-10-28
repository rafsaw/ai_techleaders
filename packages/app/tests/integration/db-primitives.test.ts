import { join } from "node:path";

import { fixedClock, generateToken, hashToken, type AppContainer } from "@devmentor/core";
import { afterAll, beforeAll, beforeEach, describe, expect, inject, it } from "vitest";

import { dbContainer, useScratchDatabase } from "./scratch-database";

/**
 * The Phase 2 database primitives against the migrated tables on real
 * PostgreSQL (E01 step 2.4): `PostgresRateLimiter` (platform P11) on
 * `rate_limit_buckets` and the single-use token consume (platform P9) on
 * `email_confirmation_tokens`. They run in a scratch database migrated with
 * `npm run db:migrate`, because the limiter's cleanup deletes every expired
 * bucket in the table and the clock here is fixed.
 */
describe("Phase 2 database primitives on PostgreSQL", () => {
  const logPath = join(inject("integrationArtifactsDirectory"), "db-primitives.log");
  const scratch = useScratchDatabase("db_primitives");
  const { query } = scratch;
  let container: AppContainer;
  let db: Awaited<ReturnType<typeof dbContainer>>["db"];

  beforeAll(async () => {
    await scratch.migrate("up", [], logPath);
    ({ container, db } = await dbContainer(scratch.url));
  });

  afterAll(async () => {
    await container?.dispose();
  });

  /** A fresh entity manager, as one request scope would get. */
  const em = () => container.cradle.orm.em.fork();

  describe("PostgresRateLimiter", () => {
    const T0 = Date.parse("2026-10-28T12:00:00.000Z");
    const rule = { limit: 2, windowMs: 60_000 };
    const limiterAt = (ms: number) => new db.PostgresRateLimiter({ em: em(), clock: fixedClock(T0 + ms) });

    const buckets = () => query<{ key_hash: string; count: number; window_ends_at: string }>(
      `select key_hash, count, to_char(window_ends_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as window_ends_at
        from rate_limit_buckets order by window_ends_at, key_hash`);

    beforeEach(async () => {
      await query(`truncate rate_limit_buckets`);
    });

    it("counts attempts per hashed key and refuses past the limit with the time left in the window", async () => {
      await expect(limiterAt(0).hit("sign-in:email:ada@example.com", rule)).resolves.toEqual({ allowed: true, retryAfterMs: 0 });
      await expect(limiterAt(1_000).hit("sign-in:email:ada@example.com", rule)).resolves.toEqual({ allowed: true, retryAfterMs: 0 });
      await expect(limiterAt(15_000).hit("sign-in:email:ada@example.com", rule)).resolves.toEqual({ allowed: false, retryAfterMs: 45_000 });
      await expect(limiterAt(59_999).hit("sign-in:email:ada@example.com", rule)).resolves.toEqual({ allowed: false, retryAfterMs: 1 });
      // Another key has its own bucket.
      await expect(limiterAt(20_000).hit("sign-in:email:bob@example.com", rule)).resolves.toEqual({ allowed: true, retryAfterMs: 0 });

      expect(await buckets()).toEqual([
        { key_hash: hashToken("sign-in:email:ada@example.com"), count: 4, window_ends_at: "2026-10-28T12:01:00.000Z" },
        { key_hash: hashToken("sign-in:email:bob@example.com"), count: 1, window_ends_at: "2026-10-28T12:01:20.000Z" },
      ]);
      // The raw key is never stored.
      expect(JSON.stringify(await query(`select * from rate_limit_buckets`))).not.toContain("ada@example.com");
    });

    it("starts a new window once the old one has ended", async () => {
      for (const at of [0, 1_000, 2_000]) await limiterAt(at).hit("sign-up:ip:203.0.113.7", rule);
      await expect(limiterAt(60_000).hit("sign-up:ip:203.0.113.7", rule)).resolves.toEqual({ allowed: true, retryAfterMs: 0 });

      expect(await buckets()).toEqual([
        { key_hash: hashToken("sign-up:ip:203.0.113.7"), count: 1, window_ends_at: "2026-10-28T12:02:00.000Z" },
      ]);
    });

    it("deletes expired buckets of keys never hit again and keeps active ones", async () => {
      await limiterAt(0).hit("short:never-again", { limit: 5, windowMs: 10_000 });
      await limiterAt(0).hit("long:still-active", { limit: 5, windowMs: 120_000 });
      await limiterAt(5_000).hit("short:ends-exactly-now", { limit: 5, windowMs: 25_000 });

      await limiterAt(30_000).hit("other:key", rule);

      expect(await buckets()).toEqual([
        { key_hash: hashToken("other:key"), count: 1, window_ends_at: "2026-10-28T12:01:30.000Z" },
        { key_hash: hashToken("long:still-active"), count: 1, window_ends_at: "2026-10-28T12:02:00.000Z" },
      ]);
    });
  });

  describe("consumeSingleUseToken on email_confirmation_tokens", () => {
    const now = new Date("2026-10-28T12:00:00.000Z");

    async function confirmationLink(expiresAt: Date): Promise<string> {
      const raw = generateToken();
      const writer = em();
      const user = writer.create(db.User, { email: `${hashToken(raw).slice(0, 12)}@example.com`, name: "Ada" });
      writer.create(db.EmailConfirmationToken, { user, email: user.email, tokenHash: hashToken(raw), expiresAt });
      await writer.flush();
      return raw;
    }

    const consumedAt = async (raw: string) => (await query<{ consumed_at: Date | null }>(
      `select consumed_at from email_confirmation_tokens where token_hash = $1`, [hashToken(raw)]))[0]?.consumed_at;

    it("consumes once; a second consume reports used", async () => {
      const raw = await confirmationLink(new Date(now.getTime() + 3_600_000));

      await expect(db.consumeSingleUseToken(em(), db.EmailConfirmationToken, raw, now)).resolves.toMatchObject({ status: "consumed" });
      expect(await consumedAt(raw)).toEqual(now);
      await expect(db.consumeSingleUseToken(em(), db.EmailConfirmationToken, raw, now)).resolves.toMatchObject({ status: "used" });
      expect(await consumedAt(raw)).toEqual(now);
    });

    it("lets exactly one of two concurrent transactions consume", async () => {
      const raw = await confirmationLink(new Date(now.getTime() + 3_600_000));

      const results = await Promise.all([0, 1].map(() => em().transactional((tx) =>
        db.consumeSingleUseToken(tx, db.EmailConfirmationToken, raw, now))));

      expect(results.map(({ status }) => status).sort()).toEqual(["consumed", "used"]);
      expect(await consumedAt(raw)).toEqual(now);
    });

    it("reports an expired link without consuming it", async () => {
      const raw = await confirmationLink(now);

      await expect(db.consumeSingleUseToken(em(), db.EmailConfirmationToken, raw, now)).resolves.toMatchObject({ status: "expired" });
      expect(await consumedAt(raw)).toBeNull();
    });
  });
});
