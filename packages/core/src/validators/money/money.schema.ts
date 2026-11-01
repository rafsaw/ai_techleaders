import { z } from "zod";

export const CURRENCY = "USD" as const;

export type Money = { amountMinor: number; currency: typeof CURRENCY };

export const priceDollarsSchema = z.coerce
  .number({ error: "Enter a whole number of dollars" })
  .int("Enter a whole number of dollars")
  .min(5, "The lowest price is $5")
  .max(1_000, "The highest price is $1,000");

/** Converts a validated whole-dollar session price to integer minor units. */
export function toCents(dollars: number): number {
  return dollars * 100;
}

/** Formats integer USD minor units without discarding meaningful cents. */
export function formatMoney(money: Money): string {
  const hasCents = money.amountMinor % 100 !== 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: CURRENCY,
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(money.amountMinor / 100);
}
