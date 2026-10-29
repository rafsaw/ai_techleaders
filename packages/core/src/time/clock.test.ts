import { afterEach, describe, expect, it, vi } from "vitest";

import { fixedClock, systemClock } from "./clock";

afterEach(() => vi.useRealTimers());

describe("clock", () => {
  it("systemClock reads the current time", () => {
    vi.useFakeTimers({ now: new Date("2026-10-27T12:00:00.000Z") });
    expect(systemClock.now().toISOString()).toBe("2026-10-27T12:00:00.000Z");
    vi.setSystemTime(new Date("2026-10-28T00:00:00.000Z"));
    expect(systemClock.now().toISOString()).toBe("2026-10-28T00:00:00.000Z");
  });

  it.each([new Date("2026-01-01T00:00:00.000Z"), "2026-01-01T00:00:00.000Z", Date.UTC(2026, 0, 1)])(
    "fixedClock stays frozen at %s",
    (input) => {
      const clock = fixedClock(input);
      const first = clock.now();
      expect(first.toISOString()).toBe("2026-01-01T00:00:00.000Z");
      first.setFullYear(1999);
      expect(clock.now().toISOString()).toBe("2026-01-01T00:00:00.000Z");
      expect(clock.now()).not.toBe(clock.now());
    },
  );

  it("fixedClock is not affected by mutating the source date", () => {
    const source = new Date("2026-01-01T00:00:00.000Z");
    const clock = fixedClock(source);
    source.setFullYear(2030);
    expect(clock.now().getUTCFullYear()).toBe(2026);
  });

  it("fixedClock rejects an invalid date", () => {
    expect(() => fixedClock("not a date")).toThrow(RangeError);
  });
});
