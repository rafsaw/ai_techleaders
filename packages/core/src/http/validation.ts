import type { z } from "zod";

import { ValidationError, type FieldErrors } from "./errors";

/** Parses `input` with `schema`, throwing a `ValidationError` with per-field messages. */
export function parseInput<TSchema extends z.ZodType>(
  schema: TSchema,
  input: unknown,
): z.output<TSchema> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;

  const fieldErrors: FieldErrors = {};
  let formError: string | undefined;
  for (const issue of result.error.issues) {
    const [field] = issue.path;
    if (field === undefined) formError ??= issue.message;
    else (fieldErrors[String(field)] ??= []).push(issue.message);
  }
  throw new ValidationError(fieldErrors, formError, { cause: result.error });
}

export async function readJsonBody(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch (error) {
    throw new ValidationError({}, "Request body must be valid JSON", { cause: error });
  }
}
