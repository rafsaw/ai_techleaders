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
    const { RoleService } = await import("@/server/services/auth/role.service");
    const { AuthSessionService } = await import("@/server/services/auth/auth-session.service");
    const { ArcticGitHubOAuth } = await import("@/server/services/auth/adapters/arctic-github-oauth");
    const { GitHubSignInService } = await import("@/server/services/auth/github-sign-in.service");
    const { SmtpEmailSender } = await import("@/server/services/notifications/adapters/smtp-email-sender");
    const { PostgresRateLimiter } = await import("@devmentor/db");
    const { BcryptPasswordHasher } = await import("@/server/services/auth/adapters/bcrypt-password-hasher");
    const { PasswordAccountService } = await import("@/server/services/auth/password-account.service");
    expect(cache.__devmentorContainer).toBe(container);
    expect(Object.keys(container.registrations)).toEqual(expect.arrayContaining(["logger", "clock", "config", "principalResolver", "orm", "em", "userService", "roleService", "authSessionService", "githubOAuth", "githubSignInService", "emailSender", "rateLimiter", "passwordHasher", "passwordAccountService"]));
    const em = { fake: true };
    container.register({ em: asValue(em) });
    const first = createRequestScope();
    expect(first).not.toBe(createRequestScope());
    expect(first.cradle.userService).toBeInstanceOf(UserService);
    expect(first.cradle.config).toBe(container.cradle.config);
    expect(typeof first.cradle.config.app).toBe("function");
    expect(first.cradle.roleService).toBeInstanceOf(RoleService);
    expect(first.cradle.authSessionService).toBeInstanceOf(AuthSessionService);
    expect(first.cradle.githubOAuth).toBeInstanceOf(ArcticGitHubOAuth);
    expect(first.cradle.githubSignInService).toBeInstanceOf(GitHubSignInService);
    // The resolver is the session service; services are transient.
    expect(first.cradle.principalResolver).toBeInstanceOf(AuthSessionService);
    expect(first.cradle.userService).not.toBe(first.cradle.userService);
    // One SMTP sender per process; resolving it needs no SMTP config.
    expect(first.cradle.emailSender).toBeInstanceOf(SmtpEmailSender);
    expect(first.cradle.emailSender).toBe(createRequestScope().cradle.emailSender);
    // The limiter uses the scope's em, so it is resolved per use.
    expect(first.cradle.rateLimiter).toBeInstanceOf(PostgresRateLimiter);
    expect(first.cradle.rateLimiter).not.toBe(first.cradle.rateLimiter);
    // One hasher per process (its dummy hash is computed once); the account service is transient.
    expect(first.cradle.passwordHasher).toBeInstanceOf(BcryptPasswordHasher);
    expect(first.cradle.passwordHasher).toBe(createRequestScope().cradle.passwordHasher);
    expect(first.cradle.passwordAccountService).toBeInstanceOf(PasswordAccountService);
    expect(first.cradle.passwordAccountService).not.toBe(first.cradle.passwordAccountService);
    // No session cookie: signed out without touching config or the database.
    const req = new Request("http://localhost/");
    await expect(first.cradle.principalResolver.resolve(req, new ResponseCookies())).resolves.toBeNull();
    vi.resetModules();
    expect((await import("@/server/container")).container).toBe(container);
  });
});
