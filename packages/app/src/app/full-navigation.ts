import { returnToSchema } from "@devmentor/core/validators/auth/return-to.schema";

/**
 * A full browser navigation (platform F5) to a validated internal page path,
 * used after auth changes so every layout and header renders again with the
 * new identity. Unsafe destinations go to `/` (platform P6).
 */
export function navigateFully(destination: unknown): void {
  window.location.assign(returnToSchema.parse(destination));
}
