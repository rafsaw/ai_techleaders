import { describe, expect, it } from "vitest";

import { accountUpdateSchema, DISPLAY_NAME_MAX_LENGTH } from "./account-update.schema";

describe("account update schema", () => {
  it("trims the display name and strips unknown keys", () => {
    expect(accountUpdateSchema.parse({ displayName: "  Ada Lovelace ", roles: ["operator"] }))
      .toEqual({ displayName: "Ada Lovelace" });
  });

  it("accepts exactly the maximum length", () => {
    const displayName = "x".repeat(DISPLAY_NAME_MAX_LENGTH);
    expect(accountUpdateSchema.parse({ displayName })).toEqual({ displayName });
  });

  it.each([
    [{ displayName: "" }, "Display name is required"],
    [{ displayName: "   " }, "Display name is required"],
    [{ displayName: "x".repeat(DISPLAY_NAME_MAX_LENGTH + 1) }, "Use at most 100 characters"],
  ])("rejects %j with a useful message", (input, message) => {
    const result = accountUpdateSchema.safeParse(input);
    expect(result.error?.issues.map((issue) => issue.message)).toEqual([message]);
  });

  it.each([{}, { displayName: 42 }, null])("rejects malformed input %j", (input) => {
    expect(accountUpdateSchema.safeParse(input).success).toBe(false);
  });
});
