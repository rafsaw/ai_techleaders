import { describe, expect, it } from "vitest";

import {
  backToMentorsHref,
  mentorProfileHref,
  mentorsHref,
  readAreaSelection,
} from "@/app/(frontend)/mentors/mentor-areas";

describe("readAreaSelection", () => {
  it.each([undefined, ""])("treats a missing or empty area as All mentors: %j", (value) => {
    expect(readAreaSelection(value)).toEqual({ kind: "all" });
  });

  it.each(["typescript", "react", "python"] as const)("accepts the approved area %s", (area) => {
    expect(readAreaSelection(area)).toEqual({ kind: "area", area });
  });

  it.each(["TypeScript", "go", " react", "typescript,react"])(
    "refuses an unknown non-empty area without guessing: %j",
    (value) => {
      expect(readAreaSelection(value)).toEqual({ kind: "unknown" });
    }
  );

  it.each([["react", "python"], ["react"]])(
    "refuses a repeated area rather than picking one of the values: %j",
    (...values) => {
      expect(readAreaSelection(values.flat())).toEqual({ kind: "unknown" });
    }
  );
});

describe("mentorsHref", () => {
  it("builds the unfiltered and filtered listing URLs", () => {
    expect(mentorsHref()).toBe("/mentors");
    expect(mentorsHref("react")).toBe("/mentors?area=react");
  });
});

describe("backToMentorsHref", () => {
  it("returns to the area a filtered listing visit used", () => {
    expect(backToMentorsHref("python")).toBe("/mentors?area=python");
  });

  it.each([undefined, "", "nope", ["react", "python"]])(
    "returns to All mentors for absent, empty, invalid or repeated context: %j",
    (value) => {
      expect(backToMentorsHref(value)).toBe("/mentors");
    }
  );
});

describe("mentorProfileHref", () => {
  it("carries a validated filter to the profile, and nothing otherwise", () => {
    expect(mentorProfileHref("profile-id", { kind: "area", area: "typescript" })).toBe(
      "/mentors/profile-id?fromArea=typescript"
    );
    expect(mentorProfileHref("profile-id", { kind: "all" })).toBe("/mentors/profile-id");
    expect(mentorProfileHref("profile-id", { kind: "unknown" })).toBe("/mentors/profile-id");
  });
});
