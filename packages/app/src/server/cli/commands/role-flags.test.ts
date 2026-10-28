import { ValidationError } from "@devmentor/core";
import { describe, expect, it } from "vitest";

import { parseRoleFlags, ROLE_OPTIONS, ROLE_USAGE } from "@/server/cli/commands/role-flags";

function refusal(values: Record<string, string | boolean | undefined>): ValidationError {
  try {
    parseRoleFlags(values);
  } catch (error) {
    return error as ValidationError;
  }
  throw new Error("expected a refusal");
}

describe("role flags", () => {
  it("declares string flags and their usage", () => {
    expect(ROLE_OPTIONS).toEqual({ email: { type: "string" }, role: { type: "string" } });
    expect(ROLE_USAGE).toBe("--email <email> --role operator");
  });

  it("normalizes the email and accepts only operator", () => {
    expect(parseRoleFlags({ email: "  Ada@Example.COM ", role: "operator" })).toEqual({ email: "ada@example.com", role: "operator" });
  });

  it("refuses mentor: it comes only from an accepted invitation", () => {
    const error = refusal({ email: "a@b.co", role: "mentor" });
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.message).toBe("The mentor role is granted only by accepting an invitation.");
    expect(error.fieldErrors).toEqual({ role: [error.message] });
  });

  it("refuses other or missing roles and invalid or missing emails", () => {
    expect(refusal({ email: "a@b.co", role: "mentee" }).message).toBe("--role must be operator.");
    expect(refusal({ email: "a@b.co" }).message).toBe("--role must be operator.");
    expect(refusal({ email: "nope", role: "operator" }).fieldErrors).toEqual({ email: ["--email must be a valid email address."] });
    expect(refusal({ role: "operator" }).message).toBe("--email must be a valid email address.");
  });
});
