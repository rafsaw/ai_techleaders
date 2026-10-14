export type LogContext = Record<string, unknown>;

export interface Logger {
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}

/** Values under these keys (case-insensitive) are never written to a log. */
const REDACTED_KEYS = new Set([
  "password",
  "token",
  "accesstoken",
  "refreshtoken",
  "jwt",
  "authorization",
  "cookie",
  "secret",
]);

// Log contexts are small, hand-built objects; the cap only guards against
// cycles, so a deeper value is dropped rather than walked.
const MAX_REDACT_DEPTH = 5;

function redact(value: unknown, depth = 0): unknown {
  if (value === null || typeof value !== "object" || value instanceof Error) return value;
  if (depth >= MAX_REDACT_DEPTH) return "[Truncated]";
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      REDACTED_KEYS.has(key.toLowerCase()) ? "[Redacted]" : redact(item, depth + 1),
    ]),
  );
}

export function createConsoleLogger(): Logger {
  const write =
    (level: keyof Logger) =>
    (message: string, context?: LogContext): void => {
      if (context) console[level](message, redact(context));
      else console[level](message);
    };

  return { info: write("info"), warn: write("warn"), error: write("error") };
}
