import { asValue, ResponseCookies } from "@devmentor/core";
import { afterEach, describe, expect, it, vi } from "vitest";

const cache = globalThis as typeof globalThis & { __devmentorContainer?: unknown };

afterEach(() => { delete cache.__devmentorContainer; vi.resetModules(); });

describe("composition root", () => {
  it("registers dependencies and creates fresh request scopes", async () => {
    delete cache.__devmentorContainer;
    vi.resetModules();
    const { container, createRequestScope } = await import("@/server/container");
    const { UserService } = await import("@/server/services/auth/user.service");
    expect(cache.__devmentorContainer).toBe(container);
    expect(Object.keys(container.registrations)).toEqual(expect.arrayContaining(["logger", "clock", "config", "principalResolver", "orm", "em", "userService"]));
    const em = { fake: true };
    container.register({ em: asValue(em) });
    const first = createRequestScope();
    expect(first).not.toBe(createRequestScope());
    expect(first.cradle.userService).toBeInstanceOf(UserService);
    expect(first.cradle.config).toBe(container.cradle.config);
    expect(typeof first.cradle.config.app).toBe("function");
    // Until sessions exist (accounts step 1.6) nobody resolves as signed in.
    const req = new Request("http://localhost/", { headers: { cookie: "devmentor_session=abc" } });
    await expect(first.cradle.principalResolver.resolve(req, new ResponseCookies())).resolves.toBeNull();
    vi.resetModules();
    expect((await import("@/server/container")).container).toBe(container);
  });
});
