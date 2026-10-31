import { describe, expect, it } from "vitest";

import { CURRENCY, formatMoney, priceDollarsSchema, toCents } from "./money.schema";

describe("money contract", () => {
  it.each([
    ["5", 5],
    [1_000, 1_000],
  ])("accepts a whole-dollar session price %#", (input, expected) => {
    expect(priceDollarsSchema.parse(input)).toBe(expected);
  });

  it.each([
    ["", "The lowest price is $5"],
    [4, "The lowest price is $5"],
    [-1, "The lowest price is $5"],
    [1_001, "The highest price is $1,000"],
    [5.5, "Enter a whole number of dollars"],
    ["not-a-number", "Enter a whole number of dollars"],
  ])("rejects an invalid session price %#", (input, message) => {
    expect(priceDollarsSchema.safeParse(input).error?.issues[0]?.message).toBe(message);
  });

  it("converts dollars to cents and formats whole dollars and meaningful cents", () => {
    expect(CURRENCY).toBe("USD");
    expect(toCents(40)).toBe(4_000);
    expect(formatMoney({ amountMinor: 4_000, currency: CURRENCY })).toBe("$40");
    expect(formatMoney({ amountMinor: 140, currency: CURRENCY })).toBe("$1.40");
    expect(formatMoney({ amountMinor: 1, currency: CURRENCY })).toBe("$0.01");
  });
});
