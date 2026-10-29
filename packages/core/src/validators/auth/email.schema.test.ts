import { describe, expect, it } from "vitest";

import { EMAIL_MAX_LENGTH, emailSchema } from "./email.schema";

describe("email schema", () => {
  it("trims and lower-cases the address", () => {
    expect(emailSchema.parse("  Ada@Example.COM ")).toBe("ada@example.com");
  });

  it("accepts the longest address and rejects one character more", () => {
    const longest = `${"a".repeat(EMAIL_MAX_LENGTH - "@example.com".length)}@example.com`;
    expect(emailSchema.parse(longest)).toBe(longest);
    expect(emailSchema.safeParse(`a${longest}`).success).toBe(false);
  });

  it.each(["", "ada", "ada@", 42, null])("rejects %j", (value) => {
    expect(emailSchema.safeParse(value).success).toBe(false);
  });

  it("explains an invalid address", () => {
    expect(emailSchema.safeParse("nope").error?.issues.map((issue) => issue.message)).toEqual(["Enter a valid email address"]);
  });
});
