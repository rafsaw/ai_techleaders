import { describe, expect, it } from "vitest";

import { ConfigError } from "../config/env";
import { summarizeError } from "./logging";

describe("summarizeError", () => {
  it("keeps only the name of an ordinary error, dropping message, stack and cause", () => {
    const error = new Error("GET https://x/?token=abc failed", { cause: new Error("secret") });
    expect(summarizeError(error)).toEqual({ name: "Error" });
    expect(summarizeError(new TypeError("details"))).toEqual({ name: "TypeError" });
  });

  it("keeps identifier-shaped string codes only", () => {
    const withCode = (code: unknown) => Object.assign(new Error("x"), { code });
    expect(summarizeError(withCode("ECONNREFUSED"))).toEqual({ name: "Error", code: "ECONNREFUSED" });
    expect(summarizeError(withCode("23505"))).toEqual({ name: "Error", code: "23505" });
    expect(summarizeError(withCode("https://x/?token=abc"))).toEqual({ name: "Error" });
    expect(summarizeError(withCode(42))).toEqual({ name: "Error" });
  });

  it("replaces a name that is not an identifier", () => {
    const error = new Error("x");
    error.name = "Bearer abc def";
    expect(summarizeError(error)).toEqual({ name: "Error" });
  });

  it("keeps the ConfigError message, which names keys and never values", () => {
    expect(summarizeError(new ConfigError(["APP_URL"], ["GITHUB_API_URL"]))).toEqual({
      name: "ConfigError", message: "Invalid configuration: missing APP_URL; invalid GITHUB_API_URL",
    });
  });

  it("reports only the type of a thrown non-error", () => {
    expect(summarizeError("token=abc")).toEqual({ name: "string" });
    expect(summarizeError(undefined)).toEqual({ name: "undefined" });
  });
});
