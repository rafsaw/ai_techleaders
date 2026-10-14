import type { UserService } from "@/server/services/auth/user.service";

// Types of the services registered in container.ts, one line per service.
declare module "@devmentor/core" {
  interface Cradle {
    userService: UserService;
  }
}
