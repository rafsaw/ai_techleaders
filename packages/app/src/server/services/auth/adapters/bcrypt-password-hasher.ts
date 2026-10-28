import bcrypt from "bcryptjs";

import type { PasswordHasher } from "@/server/services/auth/password-hasher.port";

/** bcrypt cost factor in production (accounts AD1). */
export const BCRYPT_COST = 12;

/** A fixed input for the timing-equalization hash; it never matches a real password check. */
const DUMMY_INPUT = "devmentor-timing-equalization";

/**
 * `PasswordHasher` with bcryptjs (pure JS, ESM, no native build step). The
 * cost is a constructor option so unit tests can use bcrypt's minimum (4).
 *
 * The dummy hash is computed once with the same cost on first use and reused,
 * so every `dummyCompare` costs what a real `compare` costs. Register the
 * adapter as a singleton so that happens once per process.
 */
export class BcryptPasswordHasher implements PasswordHasher {
  readonly #cost: number;
  #dummyHash: Promise<string> | undefined;

  constructor({ cost = BCRYPT_COST }: { cost?: number } = {}) {
    this.#cost = cost;
  }

  async hash(password: string): Promise<string> {
    if (bcrypt.truncates(password)) throw new RangeError("Password is longer than 72 bytes");
    return bcrypt.hash(password, this.#cost);
  }

  async compare(password: string, hash: string): Promise<boolean> {
    if (bcrypt.truncates(password)) {
      await this.dummyCompare(DUMMY_INPUT);
      return false;
    }
    return bcrypt.compare(password, hash);
  }

  async dummyCompare(password: string): Promise<void> {
    this.#dummyHash ??= bcrypt.hash(DUMMY_INPUT, this.#cost);
    // Over-long input is compared as the fixed input: same cost, never truncated.
    await bcrypt.compare(bcrypt.truncates(password) ? DUMMY_INPUT : password, await this.#dummyHash);
  }
}
