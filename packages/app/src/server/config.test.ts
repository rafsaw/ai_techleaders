import { ConfigError } from "@devmentor/core";
import { describe, expect, it, vi } from "vitest";

import { createAppConfig } from "@/server/config";

describe("app config", () => {
  it("reads the app section", () => {
    const config = createAppConfig({ APP_URL: "http://localhost:3000" });
    expect(config.app().url.href).toBe("http://localhost:3000/");
  });

  it("does not trust a proxy unless TRUST_PROXY is exactly true", () => {
    expect(createAppConfig({ APP_URL: "http://localhost:3000" }).app().trustProxy).toBe(false);
    expect(createAppConfig({ APP_URL: "http://localhost:3000", TRUST_PROXY: "" }).app().trustProxy).toBe(false);
    expect(createAppConfig({ APP_URL: "http://localhost:3000", TRUST_PROXY: "false" }).app().trustProxy).toBe(false);
    expect(createAppConfig({ APP_URL: "http://localhost:3000", TRUST_PROXY: "true" }).app().trustProxy).toBe(true);
  });

  it.each(["TRUE", "1", "yes", " true"])("rejects TRUST_PROXY=%j", (value) => {
    expect(() => createAppConfig({ APP_URL: "http://localhost:3000", TRUST_PROXY: value }).app())
      .toThrow(new ConfigError([], ["TRUST_PROXY"]));
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

  it("reads the email section", () => {
    const email = createAppConfig({ SMTP_URL: "smtp://localhost:1025", MAIL_FROM: " DevMentor <no-reply@devmentor.test> " }).email();
    expect(email).toEqual({ smtpUrl: "smtp://localhost:1025", from: "DevMentor <no-reply@devmentor.test>" });
    expect(createAppConfig({ SMTP_URL: "smtps://user:pass@mail.test:465", MAIL_FROM: "a@b.test" }).email().smtpUrl).toBe("smtps://user:pass@mail.test:465");
  });

  it("validates the email section only when read, without echoing the SMTP URL", () => {
    const config = createAppConfig({ APP_URL: "http://localhost:3000" });
    expect(config.app().url.port).toBe("3000");
    expect(() => config.email()).toThrow(new ConfigError(["SMTP_URL", "MAIL_FROM"], []));
    const invalid = createAppConfig({ SMTP_URL: "https://user:hunter2@mail.test", MAIL_FROM: "   " });
    let error: unknown;
    try {
      invalid.email();
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(ConfigError);
    expect((error as ConfigError).message).toBe("Invalid configuration: invalid SMTP_URL, MAIL_FROM");
    expect((error as ConfigError).message).not.toContain("hunter2");
  });

  it("reads Stripe configuration lazily with the hosted Connect origin default", () => {
    const config = createAppConfig({
      APP_URL: "https://devmentor.test",
      STRIPE_SECRET_KEY: "sk_test_safe",
      STRIPE_CONNECT_WEBHOOK_SECRET: "whsec_safe",
    });
    expect(config.app().url.origin).toBe("https://devmentor.test");
    expect(config.stripe()).toEqual({
      secretKey: "sk_test_safe",
      connectWebhookSecret: "whsec_safe",
      onboardingOrigin: "https://connect.stripe.com",
    });
  });

  it("parses an optional Stripe API URL and configured onboarding origin", () => {
    const stripe = createAppConfig({
      STRIPE_SECRET_KEY: "sk_test_safe",
      STRIPE_CONNECT_WEBHOOK_SECRET: "whsec_safe",
      STRIPE_API_URL: "http://127.0.0.1:4020/v1",
      STRIPE_ONBOARDING_ORIGIN: "http://127.0.0.1:4020/hosted/",
    }).stripe();
    expect(stripe).toEqual({
      secretKey: "sk_test_safe",
      connectWebhookSecret: "whsec_safe",
      apiUrl: new URL("http://127.0.0.1:4020/v1"),
      onboardingOrigin: "http://127.0.0.1:4020",
    });
  });

  it("reports missing Stripe keys by name without exposing values", () => {
    const config = createAppConfig({ APP_URL: "https://devmentor.test", STRIPE_SECRET_KEY: "sk_test_private_value" });
    expect(config.app().url).toBeInstanceOf(URL);
    let error: unknown;
    try {
      config.stripe();
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(ConfigError);
    expect((error as ConfigError).message).toBe("Invalid configuration: missing STRIPE_CONNECT_WEBHOOK_SECRET");
    expect((error as ConfigError).message).not.toContain("sk_test_private_value");
  });

  it.each([
    { STRIPE_SECRET_KEY: "", STRIPE_CONNECT_WEBHOOK_SECRET: "whsec" },
    { STRIPE_SECRET_KEY: "sk", STRIPE_CONNECT_WEBHOOK_SECRET: "", STRIPE_API_URL: "ftp://stripe.test" },
    { STRIPE_SECRET_KEY: "sk", STRIPE_CONNECT_WEBHOOK_SECRET: "whsec", STRIPE_ONBOARDING_ORIGIN: "ftp://stripe.test" },
  ])("rejects invalid Stripe configuration without including secret values", (env) => {
    const config = createAppConfig(env);
    expect(() => config.stripe()).toThrow(ConfigError);
    try {
      config.stripe();
    } catch (error) {
      expect((error as Error).message).not.toContain("whsec");
      expect((error as Error).message).not.toContain("sk");
    }
  });

  it("reads process.env by default", () => {
    vi.stubEnv("APP_URL", "http://localhost:4000");
    expect(createAppConfig().app().url.port).toBe("4000");
  });
});
