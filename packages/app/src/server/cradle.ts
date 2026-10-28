import type { AppConfig } from "@/server/config";
import type { AuthSessionService } from "@/server/services/auth/auth-session.service";
import type { GitHubOAuth } from "@/server/services/auth/github-oauth.port";
import type { GitHubSignInService } from "@/server/services/auth/github-sign-in.service";
import type { RoleService } from "@/server/services/auth/role.service";
import type { UserService } from "@/server/services/auth/user.service";

// Types of the services registered in container.ts, one line per service.
declare module "@devmentor/core" {
  interface Cradle {
    config: AppConfig;
    authSessionService: AuthSessionService;
    githubOAuth: GitHubOAuth;
    githubSignInService: GitHubSignInService;
    roleService: RoleService;
    userService: UserService;
  }
}
