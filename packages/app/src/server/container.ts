import "server-only";

import { asClass, createAppContainer, registerCore, type AppContainer } from "@devmentor/core";
import { registerDb } from "@devmentor/db";

import { UserService } from "@/server/services/auth/user.service";

// The composition root: the only place where dependencies are registered.
// Every service is listed explicitly (no folder scanning) and typed in cradle.ts.
function buildContainer(): AppContainer {
  const container = createAppContainer();
  registerCore(container);
  registerDb(container);
  container.register({
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
