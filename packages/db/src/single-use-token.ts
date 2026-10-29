import { hashToken, isWellFormedToken } from "@devmentor/core";
import type { EntityName, FilterQuery } from "@mikro-orm/core";
import type { EntityManager } from "@mikro-orm/postgresql";

/** The fields `singleUseTokenProperties` adds, plus the base `id`. */
export interface SingleUseTokenRecord {
  id: string;
  tokenHash: string;
  expiresAt: Date;
  consumedAt?: Date | null;
}

/**
 * What a presented token turned out to be (platform P9):
 *
 * - `valid`: unused and unexpired (`inspect` only).
 * - `consumed`: this call used it (`consume` only).
 * - `invalid`: malformed, or no record has its hash.
 * - `used`: it was already used, before or concurrently with this call.
 * - `expired`: unused, but `expiresAt <= now`.
 *
 * A token that is both used and expired reports `used`: the action it
 * unlocked has already happened, which is the more useful reason to show.
 */
export type TokenLookup<T> =
  | { status: "valid" | "consumed"; record: T }
  | { status: "invalid" }
  | { status: "expired" | "used"; record: T };

const INVALID = { status: "invalid" } as const;

/** Why a record can no longer be used, or `null` while it is still usable. */
function spent(record: SingleUseTokenRecord, now: Date): "used" | "expired" | null {
  if (record.consumedAt) return "used";
  if (record.expiresAt.getTime() <= now.getTime()) return "expired";
  return null;
}

/** Looks a raw token up by its hash; a malformed token never reaches the database. */
async function find<T extends SingleUseTokenRecord>(
  em: EntityManager,
  entity: EntityName<T>,
  rawToken: string,
): Promise<T | null> {
  if (!isWellFormedToken(rawToken)) return null;
  return em.findOne(entity, { tokenHash: hashToken(rawToken) } as FilterQuery<T>);
}

/**
 * Reports a token's state without changing it. Pages that only display a
 * link's state use this, so a GET never consumes (platform P9, accounts AD5).
 */
export async function inspectSingleUseToken<T extends SingleUseTokenRecord>(
  em: EntityManager,
  entity: EntityName<T>,
  rawToken: string,
  now: Date,
): Promise<TokenLookup<T>> {
  const record = await find(em, entity, rawToken);
  if (!record) return INVALID;
  return { status: spent(record, now) ?? "valid", record };
}

/**
 * Uses a token exactly once. Run it inside `em.transactional` together with
 * the effect it unlocks, so the effect and the consumption commit or roll
 * back together.
 *
 * The write is a conditional update (`consumed_at IS NULL AND
 * expires_at > now`), so of two concurrent consumers exactly one gets
 * `consumed`. When it affects no row, the record is re-read and reported as
 * it now stands: `expired` if it lapsed unused, otherwise `used` (the other
 * consumer won); `invalid` if the row was deleted meanwhile (a resend or a
 * revoke). The record is reloaded after the update in either case, because
 * `nativeUpdate` bypasses the identity map and a later flush would otherwise
 * see stale data.
 */
export async function consumeSingleUseToken<T extends SingleUseTokenRecord>(
  em: EntityManager,
  entity: EntityName<T>,
  rawToken: string,
  now: Date,
): Promise<TokenLookup<T>> {
  const record = await find(em, entity, rawToken);
  if (!record) return INVALID;
  const reason = spent(record, now);
  if (reason) return { status: reason, record };

  // Typed against the shared columns, which every token entity has.
  const affected = await em.nativeUpdate(
    entity as EntityName<SingleUseTokenRecord>,
    { id: record.id, consumedAt: null, expiresAt: { $gt: now } },
    { consumedAt: now },
  );
  const current = await em.refresh(record);
  if (!current) return INVALID;
  if (affected > 0) return { status: "consumed", record: current };
  return { status: spent(current, now) ?? "used", record: current };
}
