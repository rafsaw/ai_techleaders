import { describe, expect, it } from "vitest";

import {
  COMMON_PASSWORDS, currentPasswordSchema, PASSWORD_MAX_BYTES, PASSWORD_MIN_CODE_POINTS, PASSWORD_TOO_COMMON,
  PASSWORD_TOO_LONG, PASSWORD_TOO_SHORT, passwordSchema, utf8Bytes,
} from "./password.schema";

function messages(value: unknown): string[] {
  return passwordSchema.safeParse(value).error?.issues.map((issue) => issue.message) ?? [];
}

describe("passwordSchema", () => {
  it("accepts a 15-character phrase unchanged, without trimming or normalization", () => {
    for (const value of ["  my blue teapot ", "Café au lait now", "tab\tseparated pass"]) {
      expect(passwordSchema.parse(value)).toBe(value);
    }
  });

  it("counts Unicode code points, not UTF-16 units, for the minimum", () => {
    // 14 emoji are 28 UTF-16 units but only 14 characters.
    expect("😀".repeat(14).length).toBe(28);
    expect(messages("😀".repeat(13) + "ab")).toEqual([]);
    expect(messages("😀".repeat(14))).toEqual([PASSWORD_TOO_SHORT]);
    expect(messages("é".repeat(PASSWORD_MIN_CODE_POINTS - 1))).toEqual([PASSWORD_TOO_SHORT]);
    expect(passwordSchema.parse("éàüöñçøåßîêâôûë")).toBe("éàüöñçøåßîêâôûë");
  });

  it.each([
    ["exactly 14 ASCII characters", "a1b2c3d4e5f6g7"],
    ["empty", ""],
  ])("rejects %s as too short", (_label, value) => {
    expect(messages(value)).toEqual([PASSWORD_TOO_SHORT]);
  });

  it("accepts exactly 72 UTF-8 bytes and rejects 73", () => {
    const ascii72 = "x".repeat(70) + "yz";
    expect(utf8Bytes(ascii72)).toBe(PASSWORD_MAX_BYTES);
    expect(passwordSchema.parse(ascii72)).toBe(ascii72);
    expect(messages(`${ascii72}!`)).toEqual([PASSWORD_TOO_LONG]);
  });

  it("measures multibyte characters in bytes for the maximum", () => {
    // 36 two-byte letters are 72 bytes; 37 are 74, though only 37 characters.
    expect(passwordSchema.parse("éà".repeat(18))).toBe("éà".repeat(18));
    expect(messages(`${"éà".repeat(18)}é`)).toEqual([PASSWORD_TOO_LONG]);
    // 18 four-byte emoji are exactly 72 bytes; one more ASCII byte is too long.
    expect(utf8Bytes("😀🎉".repeat(9))).toBe(72);
    expect(messages("😀🎉".repeat(9))).toEqual([]);
    expect(messages(`${"😀🎉".repeat(9)}a`)).toEqual([PASSWORD_TOO_LONG]);
    // Three-byte characters: 24 fit, 25 do not.
    expect(messages("漢字".repeat(12))).toEqual([]);
    expect(messages(`${"漢字".repeat(12)}漢`)).toEqual([PASSWORD_TOO_LONG]);
  });

  it.each([...COMMON_PASSWORDS])("rejects the common password %j", (value) => {
    expect(messages(value)).toEqual([PASSWORD_TOO_COMMON]);
  });

  it("rejects long common passwords case-insensitively", () => {
    expect(messages("PasswordPassword")).toEqual([PASSWORD_TOO_COMMON]);
    expect(messages("CorrectHorseBatteryStaple")).toEqual([PASSWORD_TOO_COMMON]);
    expect(messages("TheQuickBrownFoxJumpsOverTheLazyDog")).toEqual([PASSWORD_TOO_COMMON]);
  });

  it("rejects one character repeated, at any length", () => {
    expect(messages("a".repeat(15))).toEqual([PASSWORD_TOO_COMMON]);
    expect(messages("1".repeat(40))).toEqual([PASSWORD_TOO_COMMON]);
    expect(messages("Aa".repeat(8))).toEqual([PASSWORD_TOO_COMMON]);
  });

  it("only lists entries that the length rules would otherwise accept", () => {
    for (const value of COMMON_PASSWORDS) {
      expect([...value].length).toBeGreaterThanOrEqual(PASSWORD_MIN_CODE_POINTS);
      expect(utf8Bytes(value)).toBeLessThanOrEqual(PASSWORD_MAX_BYTES);
    }
  });

  it("reports only the first failing rule", () => {
    // Too long and repeated: only the length message.
    expect(messages("a".repeat(80))).toEqual([PASSWORD_TOO_LONG]);
  });

  it.each([undefined, null, 42, ["a".repeat(15)]])("rejects a non-string %j", (value) => {
    expect(messages(value)).toEqual(["Enter a password"]);
  });
});

describe("currentPasswordSchema", () => {
  it("accepts any present password without applying the registration rules", () => {
    expect(currentPasswordSchema.parse("short")).toBe("short");
    expect(currentPasswordSchema.parse(" passwordpassword ")).toBe(" passwordpassword ");
    expect(currentPasswordSchema.parse("é".repeat(100))).toBe("é".repeat(100));
  });

  it.each([
    ["", "Enter your password"],
    [undefined, "Enter your password"],
    ["x".repeat(1025), "Email or password is incorrect"],
  ])("rejects %j", (value, message) => {
    expect(currentPasswordSchema.safeParse(value).error?.issues.map((issue) => issue.message)).toEqual([message]);
  });
});
