import "server-only";

import { createApiHandler, createMakeCrudRoute, createNavigationHandler } from "@devmentor/core";

import { container } from "@/server/container";

/** Wraps a route handler: per-request scope, CSRF check, JSON envelope, error mapping. */
export const apiHandler = createApiHandler(container);

/** Config-driven handlers for plain CRUD resources. */
export const makeCrudRoute = createMakeCrudRoute(apiHandler);

/**
 * Wraps a GET route that answers a browser navigation with a 303 (platform P7).
 * Internal redirects resolve against `APP_URL`, never the `Host` header.
 */
export const navigationHandler = createNavigationHandler(container, {
  appUrl: ({ config }) => config.app().url,
});
