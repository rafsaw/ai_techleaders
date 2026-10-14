import { afterEach, describe, expect, it, vi } from "vitest";

import { asFunction, createAppContainer, createConsoleLogger, Lifetime, registerCore } from "./index";

afterEach(() => vi.restoreAllMocks());

describe("console logger", () => {
  it.each(["info", "warn", "error"] as const)("writes %s with and without context", (level) => {
    const output = vi.spyOn(console, level).mockImplementation(() => {});
    const logger = createConsoleLogger();
    logger[level]("plain");
    logger[level]("context", { ordinary: 1 });
    expect(output).toHaveBeenNthCalledWith(1, "plain");
    expect(output).toHaveBeenNthCalledWith(2, "context", { ordinary: 1 });
  });

  it("redacts secrets recursively while preserving input and error values", () => {
    const output = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("failure");
    const context = { Password: "secret", nested: { TOKEN: "secret", safe: "public" },
      list: [{ authorization: "secret" }, null, "plain", 3], error };
    createConsoleLogger().error("message", context);
    expect(output).toHaveBeenCalledWith("message", { Password: "[Redacted]",
      nested: { TOKEN: "[Redacted]", safe: "public" },
      list: [{ authorization: "[Redacted]" }, null, "plain", 3], error });
    expect(context.Password).toBe("secret");
    expect(context.nested.TOKEN).toBe("secret");
  });

  it("bounds cyclic objects and truncates deeply nested context", () => {
    const output = vi.spyOn(console, "info").mockImplementation(() => {});
    const cycle: Record<string, unknown> = {};
    cycle.self = cycle;
    createConsoleLogger().info("cycle", cycle);
    expect(output).toHaveBeenCalledWith("cycle", {
      self: { self: { self: { self: { self: "[Truncated]" } } } },
    });
  });
});

describe("dependency container", () => {
  it("registers a singleton logger with proxy injection", () => {
    const container = createAppContainer();
    registerCore(container);
    const scope = container.createScope();
    expect(scope.cradle.logger).toBe(container.cradle.logger);
    expect(container.options.injectionMode).toBe("PROXY");
    expect(() => container.resolve("missing")).toThrow("Could not resolve 'missing'");
  });

  it("rejects a singleton that captures a scoped registration", () => {
    const container = createAppContainer();
    container.register("scoped", asFunction(() => ({}), { lifetime: Lifetime.SCOPED }));
    container.register("singleton", asFunction(({ scoped }: { scoped: object }) => scoped, {
      lifetime: Lifetime.SINGLETON,
    }));
    expect(() => container.resolve("singleton")).toThrow(/shorter lifetime/);
  });
});
