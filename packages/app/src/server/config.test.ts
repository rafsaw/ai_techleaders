import { ConfigError } from "@devmentor/core";
import { describe, expect, it, vi } from "vitest";

import { createAppConfig } from "@/server/config";

describe("app config", () => {
  it("reads the app section", () => {
    const config = createAppConfig({ APP_URL: "http://localhost:3000" });
    expect(config.app().url.href).toBe("http://localhost:3000/");
  });

  it("rejects a non-http APP_URL and names a missing one", () => {
    expect(() => createAppConfig({ APP_URL: "ftp://example.test" }).app()).toThrow("invalid APP_URL");
    expect(() => createAppConfig({}).app()).toThrow("missing APP_URL");
  });

  it("reads the github section with default endpoints", () => {
    const github = createAppConfig({ GITHUB_CLIENT_ID: "id", GITHUB_CLIENT_SECRET: "s3cret" }).github();
    expect(github).toEqual({
      clientId: "id",
      clientSecret: "s3cret",
      oauthUrl: new URL("https://github.com"),
      apiUrl: new URL("https://api.github.com"),
    });
  });

  it("lets tests override the github endpoints", () => {
    const github = createAppConfig({
      GITHUB_CLIENT_ID: "id",
      GITHUB_CLIENT_SECRET: "s3cret",
      GITHUB_OAUTH_URL: "http://127.0.0.1:4010",
      GITHUB_API_URL: "http://127.0.0.1:4010/api",
    }).github();
    expect(github.oauthUrl.origin).toBe("http://127.0.0.1:4010");
    expect(github.apiUrl.href).toBe("http://127.0.0.1:4010/api");
  });

  it("validates sections independently and never leaks secret values", () => {
    const config = createAppConfig({ APP_URL: "https://devmentor.test", GITHUB_CLIENT_SECRET: "top-secret" });
    expect(config.app().url.origin).toBe("https://devmentor.test");
    let error: unknown;
    try {
      config.github();
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(ConfigError);
    expect((error as ConfigError).message).toBe("Invalid configuration: missing GITHUB_CLIENT_ID");
    expect((error as ConfigError).message).not.toContain("top-secret");
  });

  it("reads process.env by default", () => {
    vi.stubEnv("APP_URL", "http://localhost:4000");
    expect(createAppConfig().app().url.port).toBe("4000");
  });
});
