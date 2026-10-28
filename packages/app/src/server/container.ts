import "server-only";

import {
  aliasTo,
  asClass,
  asFunction,
  createAppContainer,
  Lifetime,
  registerCore,
  type AppContainer,
} from "@devmentor/core";
import { PostgresRateLimiter, registerDb } from "@devmentor/db";

import { createAppConfig } from "@/server/config";
import { ArcticGitHubOAuth } from "@/server/services/auth/adapters/arctic-github-oauth";
import { AuthSessionService } from "@/server/services/auth/auth-session.service";
import { BcryptPasswordHasher } from "@/server/services/auth/adapters/bcrypt-password-hasher";
import { GitHubSignInService } from "@/server/services/auth/github-sign-in.service";
import { MentorInvitationService } from "@/server/services/auth/mentor-invitation.service";
import { PasswordAccountService } from "@/server/services/auth/password-account.service";
import { RoleService } from "@/server/services/auth/role.service";
import { UserService } from "@/server/services/auth/user.service";
import { SmtpEmailSender } from "@/server/services/notifications/adapters/smtp-email-sender";

// The composition root: the only place where dependencies are registered.
// Every service is listed explicitly (no folder scanning) and typed in cradle.ts.
function buildContainer(): AppContainer {
  const container = createAppContainer();
  registerCore(container);
  registerDb(container);
  container.register({
    config: asFunction(() => createAppConfig(), { lifetime: Lifetime.SINGLETON }),
    authSessionService: asClass(AuthSessionService),
    // Every request resolves its session through AuthSessionService.
    principalResolver: aliasTo("authSessionService"),
    // Callers depend on the GitHubOAuth port; this is its only adapter.
    githubOAuth: asClass(ArcticGitHubOAuth),
    githubSignInService: asClass(GitHubSignInService),
    // The PasswordHasher port's bcryptjs adapter (cost 12); a singleton so its dummy hash is computed once.
    passwordHasher: asFunction(() => new BcryptPasswordHasher(), { lifetime: Lifetime.SINGLETON }),
    passwordAccountService: asClass(PasswordAccountService),
    // Operator-only invitation management (create/revoke/resend), used by the CLI.
    mentorInvitationService: asClass(MentorInvitationService),
    roleService: asClass(RoleService),
    userService: asClass(UserService),
    // The EmailSender port's SMTP adapter; it reads config.email() on first send.
    emailSender: asClass(SmtpEmailSender, { lifetime: Lifetime.SINGLETON }),
    // The RateLimiter port's only adapter; transient because it uses the scoped em.
    rateLimiter: asClass(PostgresRateLimiter),
  });
  return container;
}

// Cached on globalThis so dev HMR and multiple server bundles share one
// container — and therefore one ORM and one connection pool per process.
const globalForContainer = globalThis as typeof globalThis & {
  __devmentorContainer?: AppContainer;
};

export const container = (globalForContainer.__devmentorContainer ??= buildContainer());

/**
 * Child scope for one unit of work (request, server action, job). Scoped
 * registrations such as `em` are created fresh for each scope.
 */
export function createRequestScope(): AppContainer {
  return container.createScope();
}
