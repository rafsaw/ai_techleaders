import { describe, expect, it } from "vitest";

import { PASSWORD_TOO_SHORT } from "./password.schema";
import { signUpSchema } from "./sign-up.schema";

const valid = { displayName: " Ada ", email: " ADA@Example.com ", password: " a short phrase " };

describe("signUpSchema", () => {
  it("normalizes the name and email, keeps the password exactly, and drops unknown keys", () => {
    expect(signUpSchema.parse({ ...valid, role: "operator", returnTo: "/invite/tok" })).toEqual({
      displayName: "Ada",
      email: "ada@example.com",
      password: " a short phrase ",
      returnTo: "/invite/tok",
    });
  });

  it.each([[undefined], ["//evil.example"], ["/api/users"]])("leaves out a missing or unsafe returnTo (%j)", (returnTo) => {
    expect(signUpSchema.parse({ ...valid, returnTo }).returnTo).toBeUndefined();
  });

  it("reports a field error for every invalid field", () => {
    const result = signUpSchema.safeParse({ displayName: " ", email: "nope", password: "short" });
    expect(result.error?.issues.map((issue) => [issue.path.join("."), issue.message])).toEqual([
      ["displayName", "Display name is required"],
      ["email", "Enter a valid email address"],
      ["password", PASSWORD_TOO_SHORT],
    ]);
  });
});
