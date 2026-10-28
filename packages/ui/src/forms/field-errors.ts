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
