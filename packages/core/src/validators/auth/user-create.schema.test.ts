import { describe, expect, it } from "vitest";

import { userCreateSchema } from "./user-create.schema";

describe("user creation schema", () => {
  it("normalizes user fields and strips unexpected properties", () => {
    expect(userCreateSchema.parse({ name: " Ada ", email: " ADA@EXAMPLE.COM ", extra: true }))
      .toEqual({ name: "Ada", email: "ada@example.com" });
  });

  it.each([
    { name: " ", email: "ada@example.com" },
    { name: "Ada", email: "invalid" },
    { name: "x".repeat(101), email: "ada@example.com" },
    { name: "Ada", email: `${"x".repeat(250)}@example.com` },
    { name: 1, email: null },
  ])("rejects invalid fields %#", (input) => {
    expect(userCreateSchema.safeParse(input).success).toBe(false);
  });

  it("uses useful empty-field validation messages", () => {
    const result = userCreateSchema.safeParse({ name: "", email: "" });
    expect(result.error?.issues.map(({ message }) => message)).toEqual([
      "Name is required", "Enter a valid email address",
    ]);
  });
});
