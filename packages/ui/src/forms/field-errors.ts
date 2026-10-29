import type { FieldErrors } from "@devmentor/ui/api/types";

type Issue = { path: readonly PropertyKey[]; message: string };

/**
 * Groups schema issues by their first path segment. Mirrors `parseInput` in `@devmentor/core`,
 * so client- and server-side errors land on the same fields; an issue without a path becomes
 * the form-level error (the first one wins).
 */
export function toFieldErrors(issues: readonly Issue[]): { fieldErrors: FieldErrors; formError?: string } {
  const fieldErrors: FieldErrors = {};
  let formError: string | undefined;
  for (const issue of issues) {
    const [field] = issue.path;
    if (field === undefined) formError ??= issue.message;
    else (fieldErrors[String(field)] ??= []).push(issue.message);
  }
  return { fieldErrors, formError };
}

/** The one 429 copy on every form (accounts API Contracts, SM-AC4): no countdown, no cause. */
export const RATE_LIMITED_MESSAGE = "Too many attempts. Try again later";

/**
 * The text a form shows for a failed request (SM-AC17: one shared pattern for technical
 * failures). A 429 always reads the same, whatever the server's wording; every other failure,
 * including the client's own network and invalid-response failures, keeps its message.
 */
export function failureMessage(error: { code: string; message: string }): string {
  return error.code === "rate_limited" ? RATE_LIMITED_MESSAGE : error.message;
}
