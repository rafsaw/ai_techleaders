import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import { generateToken, hashToken, TOKEN_BYTES } from "./tokens";

describe("generateToken", () => {
  it("returns 32 random bytes as unpadded base64url", () => {
    const token = generateToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(token, "base64url")).toHaveLength(TOKEN_BYTES);
    expect(TOKEN_BYTES).toBe(32);
  });

  it("does not repeat values", () => {
    const tokens = new Set(Array.from({ length: 200 }, () => generateToken()));
    expect(tokens.size).toBe(200);
  });

  it("uses only URL- and cookie-safe characters across many samples", () => {
    const alphabet = new Set(Array.from({ length: 200 }, () => generateToken()).join(""));
    for (const char of alphabet) expect(char).toMatch(/^[A-Za-z0-9_-]$/);
  });
});

describe("hashToken", () => {
  it("returns the SHA-256 hex digest", () => {
    expect(hashToken("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    const token = generateToken();
    expect(hashToken(token)).toBe(createHash("sha256").update(token).digest("hex"));
  });

  it("is deterministic, 64 lowercase hex characters and never the raw token", () => {
    const token = generateToken();
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(token)).not.toContain(token);
    expect(hashToken(token)).not.toBe(hashToken(generateToken()));
  });
});
