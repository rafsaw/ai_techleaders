import "server-only";

import { createApiHandler, createMakeCrudRoute } from "@devmentor/core";

import { container } from "@/server/container";

/** Wraps a route handler: per-request scope, CSRF check, JSON envelope, error mapping. */
export const apiHandler = createApiHandler(container);

/** Config-driven handlers for plain CRUD resources. */
export const makeCrudRoute = createMakeCrudRoute(apiHandler);
