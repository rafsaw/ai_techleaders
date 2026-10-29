import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { ConfigError, defineConfigSection } from "./env";

const schema = z
  .object({ SERVICE_URL: z.url(), SERVICE_KEY: z.string().min(8), SERVICE_REGION: z.string().default("eu") })
  .transform((env) => ({ url: new URL(env.SERVICE_URL), key: env.SERVICE_KEY, region: env.SERVICE_REGION }));

function thrown(read: () => unknown): ConfigError {
  try {
    read();
  } catch (error) {
    if (error instanceof ConfigError) return error;
    throw error;
  }
  throw new Error("expected a ConfigError");
}

describe("defineConfigSection", () => {
  it("parses and transforms a valid section, applying defaults", () => {
    const read = defineConfigSection(schema, { SERVICE_URL: "https://svc.test/", SERVICE_KEY: "k-12345678" });
    expect(read()).toEqual({ url: new URL("https://svc.test/"), key: "k-12345678", region: "eu" });
  });

  it("names missing keys, treating empty strings as unset", () => {
    const error = thrown(defineConfigSection(schema, { SERVICE_URL: "", OTHER: "ignored" }));
    expect(error.name).toBe("ConfigError");
    expect(error.missing).toEqual(["SERVICE_URL", "SERVICE_KEY"]);
    expect(error.invalid).toEqual([]);
    expect(error.message).toBe("Invalid configuration: missing SERVICE_URL, SERVICE_KEY");
    expect(error.cause).toBeUndefined();
  });

  it("names invalid keys without echoing their values", () => {
    const secret = "short";
    const badUrl = "not a url with secret-value";
    const error = thrown(defineConfigSection(schema, { SERVICE_URL: badUrl, SERVICE_KEY: secret }));
    expect(error.invalid).toEqual(["SERVICE_URL", "SERVICE_KEY"]);
    expect(error.message).toBe("Invalid configuration: invalid SERVICE_URL, SERVICE_KEY");
    expect(JSON.stringify(error)).not.toContain(secret);
    expect(error.message).not.toContain(secret);
    expect(error.message).not.toContain(badUrl);
  });

  it("reports missing and invalid keys together", () => {
    const error = thrown(defineConfigSection(schema, { SERVICE_URL: "nope" }));
    expect(error.message).toBe("Invalid configuration: missing SERVICE_KEY; invalid SERVICE_URL");
  });

  it("reports a section-level rule failure without naming values", () => {
    const pair = z
      .object({ A: z.string().optional(), B: z.string().optional() })
      .refine((env) => env.A === undefined || env.B !== undefined, "A needs B");
    const error = thrown(defineConfigSection(pair, { A: "value-a" }));
    expect(error.invalid).toEqual(["(section)"]);
    expect(error.message).toBe("Invalid configuration: invalid (section)");
  });

  it("reads lazily from process.env by default", () => {
    vi.stubEnv("SERVICE_URL", "https://env.test/");
    vi.stubEnv("SERVICE_KEY", "env-key-123");
    const read = defineConfigSection(schema);
    expect(read().url.href).toBe("https://env.test/");
  });

  it("memoizes a successful read and retries a failed one", () => {
    const source: Record<string, string | undefined> = { SERVICE_URL: "https://svc.test/" };
    const parse = vi.spyOn(schema, "safeParse");
    const read = defineConfigSection(schema, source);
    expect(parse).not.toHaveBeenCalled();
    expect(read).toThrow(ConfigError);
    source.SERVICE_KEY = "k-12345678";
    const first = read();
    source.SERVICE_KEY = "changed-key-123";
    expect(read()).toBe(first);
    expect(parse).toHaveBeenCalledTimes(2);
  });
});
