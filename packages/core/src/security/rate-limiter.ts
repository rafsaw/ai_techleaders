/** How many attempts a key may make per fixed window (platform P11). */
export interface RateLimitRule {
  /** Attempts allowed per window, counting the current one. */
  limit: number;
  /** Window length in milliseconds, started by the key's first attempt. */
  windowMs: number;
}

export interface RateLimitResult {
  /** Whether this attempt is within the rule's limit. */
  allowed: boolean;
  /** Milliseconds until the window ends when refused; `0` when allowed. */
  retryAfterMs: number;
}

/**
 * Counts attempts per key in fixed windows (platform P11). Every call counts,
 * refused ones included, so a caller hits the limiter before doing the work
 * and before opening a business transaction.
 *
 * `key` must name the rule and the normalized subject, e.g.
 * `sign-in:ip:203.0.113.7` or `sign-in:email:a@example.com`, so two rules
 * never share a bucket. Adapters store only a hash of it, never the raw email
 * or address. Callers skip per-IP rules when `clientIp` is `null`; they never
 * pool unknown visitors into one key.
 */
export interface RateLimiter {
  hit(key: string, rule: RateLimitRule): Promise<RateLimitResult>;
}
