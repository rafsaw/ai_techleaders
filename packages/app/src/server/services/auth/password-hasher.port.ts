// The password hashing port (accounts AD1). Callers depend on this interface;
// `adapters/bcrypt-password-hasher.ts` implements it with bcryptjs.

export interface PasswordHasher {
  /** A new salted hash of `password`. Throws `RangeError` for input bcrypt would truncate (over 72 UTF-8 bytes). */
  hash(password: string): Promise<string>;
  /** Whether `password` matches `hash`. Input over 72 bytes never matches, so nothing is silently truncated. */
  compare(password: string, hash: string): Promise<boolean>;
  /**
   * Spends the time of one `compare` against a fixed hash and discards the
   * result, so a missing account or a GitHub-only account answers as slowly as
   * a wrong password (accounts Flow 2).
   */
  dummyCompare(password: string): Promise<void>;
}
