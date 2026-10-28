import type { AppConfig } from "@/server/config";
import type { AuthSessionService } from "@/server/services/auth/auth-session.service";
import type { RoleService } from "@/server/services/auth/role.service";
import type { UserService } from "@/server/services/auth/user.service";

// Types of the services registered in container.ts, one line per service.
declare module "@devmentor/core" {
  interface Cradle {
    config: AppConfig;
    authSessionService: AuthSessionService;
    roleService: RoleService;
    userService: UserService;
  }
}
