import "server-only";

import {
  asClass,
  asFunction,
  asValue,
  createAppContainer,
  Lifetime,
  registerCore,
  type AppContainer,
  type PrincipalResolver,
} from "@devmentor/core";
import { registerDb } from "@devmentor/db";

import { createAppConfig } from "@/server/config";
import { UserService } from "@/server/services/auth/user.service";

// Placeholder until sessions exist: nobody is signed in, so every request
// resolves to no principal and nothing touches the database. Accounts spec
// Phase 1 step 6 registers `AuthSessionService` under this key instead.
const noSessionResolver: PrincipalResolver = { resolve: async () => null };

// The composition root: the only place where dependencies are registered.
// Every service is listed explicitly (no folder scanning) and typed in cradle.ts.
function buildContainer(): AppContainer {
  const container = createAppContainer();
  registerCore(container);
  registerDb(container);
  container.register({
    config: asFunction(() => createAppConfig(), { lifetime: Lifetime.SINGLETON }),
    principalResolver: asValue(noSessionResolver),
    userService: asClass(UserService),
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
