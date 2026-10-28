import { describe, expect, it } from "vitest";

import { signInSchema } from "./sign-in.schema";

describe("signInSchema", () => {
  it("normalizes the email and keeps the password exactly", () => {
    expect(signInSchema.parse({ email: " Ada@Example.com", password: " pw ", returnTo: "/mentors" })).toEqual({
      email: "ada@example.com",
      password: " pw ",
      returnTo: "/mentors",
    });
  });

  it("does not apply the registration rules to the password", () => {
    expect(signInSchema.safeParse({ email: "a@example.com", password: "x" }).success).toBe(true);
  });

  it("drops an unsafe returnTo and requires both fields", () => {
    expect(signInSchema.parse({ email: "a@example.com", password: "x", returnTo: "https://evil.example" }).returnTo)
      .toBeUndefined();
    expect(signInSchema.safeParse({ email: "", password: "" }).error?.issues.map((issue) => issue.message)).toEqual([
      "Enter a valid email address",
      "Enter your password",
    ]);
  });
});
