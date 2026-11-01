import { describe, expect, it } from "vitest";

import { MIN_LEAD_MINUTES, SLOT_BLOCK_MINUTES, slotCreateSchema } from "./slot-create.schema";

describe("slotCreateSchema", () => {
  it("normalizes UTC instants and offset instants to UTC", () => {
    expect(slotCreateSchema.parse({ startsAt: "2030-01-02T03:04:00Z" })).toEqual({
      startsAt: "2030-01-02T03:04:00.000Z",
    });
    expect(slotCreateSchema.parse({ startsAt: "2030-01-02T05:34:00+02:30" })).toEqual({
      startsAt: "2030-01-02T03:04:00.000Z",
    });
  });

  it.each([
    "2030-01-02T03:04:01Z",
    "2030-01-02T03:04:00.001Z",
    "2030-01-02T03:04:00.000001Z",
  ])("rejects non-whole-minute time %s", (startsAt) => {
    expect(slotCreateSchema.safeParse({ startsAt }).success).toBe(false);
  });

  it.each([
    "2030-01-02T03:04:00",
    "not-a-date",
    "2030-02-30T03:04:00Z",
    "2030-01-02T03:04:00+25:00",
    "2030-01-02T03:04Z",
    "2030-01-02",
  ])("rejects invalid or offset-free timestamp %s", (startsAt) => {
    expect(slotCreateSchema.safeParse({ startsAt }).success).toBe(false);
  });

  it("requires startsAt and strips unrecognized fields", () => {
    expect(slotCreateSchema.safeParse({}).success).toBe(false);
    expect(slotCreateSchema.parse({ startsAt: "2030-01-02T03:04:00Z", extra: true })).toEqual({
      startsAt: "2030-01-02T03:04:00.000Z",
    });
  });

  it("exports the agreed scheduling constants", () => {
    expect(SLOT_BLOCK_MINUTES).toBe(50);
    expect(MIN_LEAD_MINUTES).toBe(120);
  });
});
