import { describe, expect, it } from "vitest";

import { emailConfirmSchema } from "./email-confirm.schema";

describe("emailConfirmSchema", () => {
  it("accepts a token, the password as typed and a safe returnTo", () => {
    expect(emailConfirmSchema.parse({ token: "tok", password: " pw ", returnTo: "/invite/x", extra: 1 })).toEqual({
      token: "tok",
      password: " pw ",
      returnTo: "/invite/x",
    });
  });

  it("leaves out an unsafe returnTo", () => {
    expect(emailConfirmSchema.parse({ token: "tok", password: "pw", returnTo: "//evil" }).returnTo).toBeUndefined();
  });

  it.each([undefined, "", "x".repeat(257), 42])("rejects the token %j as not valid", (token) => {
    expect(emailConfirmSchema.safeParse({ token, password: "pw" }).error?.issues.map((issue) => issue.message))
      .toEqual(["This link isn't valid"]);
  });
});
