import "server-only";

import { createAppContainer, type AppContainer } from "@devmentor/core";
import { registerDb } from "@devmentor/db";

// The composition root: the only place where dependencies are registered.
function buildContainer(): AppContainer {
  const container = createAppContainer();
  registerDb(container);
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
