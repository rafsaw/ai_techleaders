import type { z } from "zod";

/** Environment variables as Node exposes them; `process.env` satisfies it. */
export type EnvSource = Readonly<Record<string, string | undefined>>;

/**
 * A configuration section could not be read. The message names the offending
 * environment variables and never their values, so it is safe to log.
 */
export class ConfigError extends Error {
  readonly missing: readonly string[];
  readonly invalid: readonly string[];

  constructor(missing: readonly string[], invalid: readonly string[]) {
    const parts = [
      missing.length > 0 ? `missing ${missing.join(", ")}` : "",
      invalid.length > 0 ? `invalid ${invalid.join(", ")}` : "",
    ].filter(Boolean);
    super(`Invalid configuration: ${parts.join("; ")}`);
    this.name = "ConfigError";
    this.missing = missing;
    this.invalid = invalid;
  }
}

/** Empty strings count as unset, so `KEY=` in an env file reads as missing. */
function normalize(source: EnvSource): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.entries(source).map(([key, value]) => [key, value === "" ? undefined : value]),
  );
}

/**
 * Returns a reader for one configuration section. `schema` is keyed by
 * environment variable names and may transform them into the section's shape.
 * Nothing is read until the reader is first called, so a build or a route that
 * does not need the section never fails on it; a successful read is memoized.
 */
export function defineConfigSection<TSchema extends z.ZodType>(
  schema: TSchema,
  source: EnvSource = process.env,
): () => z.output<TSchema> {
  let cached: { value: z.output<TSchema> } | undefined;

  return () => {
    if (cached) return cached.value;
    const env = normalize(source);
    const result = schema.safeParse(env);
    if (!result.success) {
      const missing = new Set<string>();
      const invalid = new Set<string>();
      for (const issue of result.error.issues) {
        const [field] = issue.path;
        if (field === undefined) invalid.add("(section)");
        else if (env[String(field)] === undefined) missing.add(String(field));
        else invalid.add(String(field));
      }
      // Deliberately no `cause`: zod issues may echo the rejected input.
      throw new ConfigError([...missing], [...invalid]);
    }
    cached = { value: result.data };
    return cached.value;
  };
}
