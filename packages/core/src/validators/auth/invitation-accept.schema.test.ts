import { describe, expect, it } from "vitest";

import { INVITATION_INVALID_MESSAGE, invitationAcceptSchema } from "./invitation-accept.schema";

describe("invitationAcceptSchema", () => {
  it("accepts only the token and strips anything else (no account, email or role from the body)", () => {
    expect(invitationAcceptSchema.parse({ token: "tok", email: "ada@example.com", role: "mentor", userId: "u-2" }))
      .toEqual({ token: "tok" });
  });

  it.each([undefined, "", "x".repeat(257), 42])("rejects the token %j as not valid", (token) => {
    expect(invitationAcceptSchema.safeParse({ token }).error?.issues.map((issue) => issue.message))
      .toEqual([INVITATION_INVALID_MESSAGE]);
    expect(INVITATION_INVALID_MESSAGE).toBe("This invitation is not valid");
  });
});
