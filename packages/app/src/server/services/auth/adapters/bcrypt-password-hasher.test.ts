import bcrypt from "bcryptjs";
import { describe, expect, it, vi } from "vitest";

import { BCRYPT_COST, BcryptPasswordHasher } from "@/server/services/auth/adapters/bcrypt-password-hasher";

const PASSWORD = "a short phrase of mine";

describe("BcryptPasswordHasher", () => {
  it("defaults to cost 12", async () => {
    expect(BCRYPT_COST).toBe(12);
    const spy = vi.spyOn(bcrypt, "hash").mockResolvedValueOnce("$2b$12$hash" as never);
    await new BcryptPasswordHasher().hash(PASSWORD);
    expect(spy).toHaveBeenCalledWith(PASSWORD, 12);
  });

  it("hashes to a 60-character salted bcrypt hash that compares true only for the same password", async () => {
    const hasher = new BcryptPasswordHasher({ cost: 4 });
    const hash = await hasher.hash(PASSWORD);
    expect(hash).toMatch(/^\$2b\$04\$.{53}$/);
    expect(await hasher.hash(PASSWORD)).not.toBe(hash);
    expect(await hasher.compare(PASSWORD, hash)).toBe(true);
    expect(await hasher.compare(`${PASSWORD} `, hash)).toBe(false);
  });

  it("hashes multibyte passwords up to 72 bytes", async () => {
    const hasher = new BcryptPasswordHasher({ cost: 4 });
    const password = "😀🎉".repeat(9);
    expect(await hasher.compare(password, await hasher.hash(password))).toBe(true);
  });

  it("refuses to hash input bcrypt would truncate", async () => {
    await expect(new BcryptPasswordHasher({ cost: 4 }).hash("é".repeat(37))).rejects.toThrow(RangeError);
  });

  it("never matches over-long input, even when its first 72 bytes match, and still spends a compare", async () => {
    const hasher = new BcryptPasswordHasher({ cost: 4 });
    const first72 = "x".repeat(72);
    const hash = await hasher.hash(first72);
    const compare = vi.spyOn(bcrypt, "compare");
    expect(await hasher.compare(`${first72}tail`, hash)).toBe(false);
    expect(compare).toHaveBeenCalledOnce();
    expect(compare.mock.calls[0]![1]).not.toBe(hash);
  });

  it("runs the dummy compare against one cached hash of the same cost", async () => {
    const hasher = new BcryptPasswordHasher({ cost: 4 });
    const hashSpy = vi.spyOn(bcrypt, "hash");
    const compare = vi.spyOn(bcrypt, "compare");
    await hasher.dummyCompare(PASSWORD);
    await hasher.dummyCompare("x".repeat(100));
    expect(hashSpy).toHaveBeenCalledOnce();
    expect(hashSpy.mock.calls[0]![1]).toBe(4);
    const dummyHash = await hashSpy.mock.results[0]!.value;
    expect(compare).toHaveBeenNthCalledWith(1, PASSWORD, dummyHash);
    expect(compare.mock.calls[1]![0]).not.toBe("x".repeat(100));
    expect(compare.mock.calls[1]![1]).toBe(dummyHash);
  });
});
