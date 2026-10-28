import { defineEntity, p } from "@mikro-orm/core";

import { baseProperties } from "../base";

const RateLimitBucketSchema = defineEntity({
  name: "RateLimitBucket",
  tableName: "rate_limit_buckets",
  properties: {
    ...baseProperties,
    /** SHA-256 hex of the limiter key (rule id + normalized email or IP); the raw key is never stored. */
    keyHash: p.string().columnType("char(64)").unique(),
    /** Attempts in the current window, the refused ones included. */
    count: p.integer(),
    /** End of the current window; indexed for the inline expiry cleanup on every hit. */
    windowEndsAt: p.datetime().index(),
  },
});

/**
 * One fixed-window counter behind `PostgresRateLimiter` (platform P11). Rows
 * are written only by the limiter's raw SQL, never through the unit of work.
 */
export class RateLimitBucket extends RateLimitBucketSchema.class {}
RateLimitBucketSchema.setClass(RateLimitBucket);
