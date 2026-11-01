import { describe, expect, it } from "vitest";

import {
  MENTOR_DESCRIPTION_MAX_LENGTH,
  PUBLIC_WORK_LINK_MAX_LENGTH,
  mentorProfileIdSchema,
  mentorProfileSchema,
} from "./mentor-profile.schema";

const valid = {
  area: "typescript",
  description: " I help with difficult TypeScript systems. ",
  publicWorkLinks: "https://github.com/ada/project\n\n https://example.com/talk ",
  price25Dollars: "40",
  price50Dollars: "70",
};

function messages(input: Record<string, unknown>, field: string) {
  const result = mentorProfileSchema.safeParse({ ...valid, ...input });
  if (result.success) return [];
  return result.error.issues.filter((issue) => issue.path[0] === field).map((issue) => issue.message);
}

describe("mentor profile schema", () => {
  it("accepts only UUID profile identifiers", () => {
    expect(mentorProfileIdSchema.safeParse("3ca6da44-e6c9-41ad-9895-829612fc1a25").success).toBe(true);
    expect(mentorProfileIdSchema.safeParse("not-a-profile-id").success).toBe(false);
  });

  it("normalizes a valid profile and drops blank link lines", () => {
    expect(mentorProfileSchema.parse(valid)).toEqual({
      area: "typescript",
      description: "I help with difficult TypeScript systems.",
      publicWorkLinks: ["https://github.com/ada/project", "https://example.com/talk"],
      price25Dollars: 40,
      price50Dollars: 70,
    });
  });

  it.each(["typescript", "react", "python"])("accepts the supported area %s", (area) => {
    expect(mentorProfileSchema.parse({ ...valid, area }).area).toBe(area);
  });

  it("rejects an unsupported or missing area with the product choices", () => {
    expect(messages({ area: "go" }, "area")).toEqual(["Choose an area"]);
    expect(messages({ area: "" }, "area")).toEqual(["Choose an area"]);
  });

  it("enforces the trimmed description bounds", () => {
    expect(messages({ description: " " }, "description")).toEqual(["Describe what you help with"]);
    expect(mentorProfileSchema.parse({ ...valid, description: " x " }).description).toBe("x");
    expect(messages({ description: "x".repeat(MENTOR_DESCRIPTION_MAX_LENGTH) }, "description")).toEqual([]);
    expect(messages({ description: "x".repeat(MENTOR_DESCRIPTION_MAX_LENGTH + 1) }, "description"))
      .toEqual(["Use at most 2,000 characters"]);
  });

  it("requires one link and permits at most five", () => {
    expect(messages({ publicWorkLinks: "\n " }, "publicWorkLinks")).toEqual(["Add at least one link"]);
    expect(messages({ publicWorkLinks: Array.from({ length: 6 }, (_, index) => `https://example.com/${index}`).join("\n") }, "publicWorkLinks"))
      .toContain("Use at most 5 public-work links");
  });

  it.each([
    ["https:github.com/x", "Line 1: use a full https:// link"],
    ["https:/github.com/x", "Line 1: use a full https:// link"],
    ["http://example.com/work", "Line 1: use a full https:// link"],
    ["/relative", "Line 1: use a full https:// link"],
    ["not a url", "Line 1: use a full https:// link"],
  ])("requires an absolute https public-work link %#", (publicWorkLinks, message) => {
    expect(messages({ publicWorkLinks }, "publicWorkLinks")).toEqual([message]);
  });

  it("reports over-long and duplicate links with their line", () => {
    const long = `https://example.com/${"x".repeat(PUBLIC_WORK_LINK_MAX_LENGTH)}`;
    expect(messages({ publicWorkLinks: long }, "publicWorkLinks")).toEqual(["Line 1: use at most 2,048 characters"]);
    expect(messages({ publicWorkLinks: "https://example.com/work\nhttps://example.com/work" }, "publicWorkLinks"))
      .toEqual(["Line 2: remove the duplicate link"]);
  });

  it("names the textarea line, counting the blank lines it drops", () => {
    expect(messages({ publicWorkLinks: "https://example.com/work\n\n\nnot-a-url" }, "publicWorkLinks"))
      .toEqual(["Line 4: use a full https:// link"]);
    expect(messages({ publicWorkLinks: "\nhttps://example.com/work\n\nhttps://example.com/work" }, "publicWorkLinks"))
      .toEqual(["Line 4: remove the duplicate link"]);
  });

  it.each(["https://example.com/\u0000", "https://example.com/a\tb", "https://example.com/a\rb"])(
    "rejects control characters inside a link %#",
    (publicWorkLinks) => {
      expect(messages({ publicWorkLinks }, "publicWorkLinks")).toEqual(["Line 1: use a full https:// link"]);
    },
  );

  it("rejects NUL in the description but keeps line breaks", () => {
    expect(messages({ description: "a\u0000b" }, "description")).toEqual(["Remove the unsupported character"]);
    expect(mentorProfileSchema.parse({ ...valid, description: "first\nsecond" }).description).toBe("first\nsecond");
  });

  it.each([
    ["price25Dollars", 4, "The lowest price is $5"],
    ["price25Dollars", 5, undefined],
    ["price50Dollars", 1_000, undefined],
    ["price50Dollars", 1_001, "The highest price is $1,000"],
    ["price50Dollars", -1, "The lowest price is $5"],
    ["price50Dollars", 40.5, "Enter a whole number of dollars"],
    ["price50Dollars", "nope", "Enter a whole number of dollars"],
  ])("validates %s with input %s", (field, value, message) => {
    expect(messages({ [field]: value }, field)).toEqual(message ? [message] : []);
  });
});
