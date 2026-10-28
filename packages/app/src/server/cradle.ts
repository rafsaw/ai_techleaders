import type { RateLimiter } from "@devmentor/core";

import type { AppConfig } from "@/server/config";
import type { AuthSessionService } from "@/server/services/auth/auth-session.service";
import type { GitHubOAuth } from "@/server/services/auth/github-oauth.port";
import type { GitHubSignInService } from "@/server/services/auth/github-sign-in.service";
import type { PasswordAccountService } from "@/server/services/auth/password-account.service";
import type { PasswordHasher } from "@/server/services/auth/password-hasher.port";
import type { RoleService } from "@/server/services/auth/role.service";
import type { UserService } from "@/server/services/auth/user.service";
import type { EmailSender } from "@/server/services/notifications/email-sender.port";

// Types of the services registered in container.ts, one line per service.
declare module "@devmentor/core" {
  interface Cradle {
    config: AppConfig;
    authSessionService: AuthSessionService;
    githubOAuth: GitHubOAuth;
    githubSignInService: GitHubSignInService;
    passwordHasher: PasswordHasher;
    passwordAccountService: PasswordAccountService;
    roleService: RoleService;
    userService: UserService;
    emailSender: EmailSender;
    rateLimiter: RateLimiter;
  }
}
