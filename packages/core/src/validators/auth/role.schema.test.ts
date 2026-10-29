import { describe, expect, it } from "vitest";

import { ROLES, roleSchema } from "./role.schema";

describe("role schema", () => {
  it.each(ROLES)("accepts %s", (role) => {
    expect(roleSchema.parse(role)).toBe(role);
  });

  it("lists exactly the three roles", () => {
    expect(ROLES).toEqual(["mentee", "mentor", "operator"]);
  });

  it.each(["admin", "Mentor", " mentee", "", null, undefined, 1, ["mentee"]])(
    "rejects %j",
    (value) => {
      expect(roleSchema.safeParse(value).success).toBe(false);
    },
  );
});
