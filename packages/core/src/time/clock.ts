/**
 * The only source of "now" for time rules. Services read `clock.now()` instead
 * of calling `new Date()`, so tests can pin time with `fixedClock`.
 */
export interface Clock {
  now(): Date;
}

export const systemClock: Clock = {
  now: () => new Date(),
};

/** A clock frozen at `date`. Each call returns a fresh copy, so callers cannot mutate it. */
export function fixedClock(date: Date | string | number): Clock {
  const time = new Date(date).getTime();
  if (Number.isNaN(time)) throw new RangeError("fixedClock needs a valid date");
  return { now: () => new Date(time) };
}
