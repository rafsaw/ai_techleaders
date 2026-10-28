import { ConfigError } from "../config/env";

/** What an unexpected error may contribute to a log line. */
export interface SafeErrorSummary {
  name: string;
  /** A short identifier such as `ECONNREFUSED` or a SQLSTATE like `23505`. */
  code?: string;
  /** Only for errors whose message is safe by construction (`ConfigError`). */
  message?: string;
}

// Names and codes are identifiers; anything else (a URL, a header, a message
// that leaked into the field) is dropped rather than logged.
const IDENTIFIER = /^[A-Za-z0-9_.-]{1,64}$/;

/**
 * Reduces an unexpected error to fields that cannot carry request data or
 * credentials. Messages, stacks and causes are left out: driver and provider
 * errors embed URLs, queries, headers and response bodies there. The
 * exception is `ConfigError`, whose message names missing keys, never values.
 */
export function summarizeError(error: unknown): SafeErrorSummary {
  if (!(error instanceof Error)) return { name: typeof error };
  const name = IDENTIFIER.test(error.name) ? error.name : "Error";
  if (error instanceof ConfigError) return { name, message: error.message };
  const code: unknown = (error as { code?: unknown }).code;
  return typeof code === "string" && IDENTIFIER.test(code) ? { name, code } : { name };
}
