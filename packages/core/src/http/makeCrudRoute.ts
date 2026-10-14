import { z } from "zod";

import type { Cradle } from "../di/container";
import type { ApiHandler, RouteHandler } from "./apiHandler";
import { parseInput, readJsonBody } from "./validation";

export type CrudMethod = "GET" | "POST" | "PUT" | "DELETE";

/** The service method each HTTP method calls. */
export interface CrudService<TCreate, TUpdate> {
  list(): Promise<unknown>;
  create(input: TCreate): Promise<unknown>;
  update(id: string, input: TUpdate): Promise<unknown>;
  delete(id: string): Promise<unknown>;
}

interface ServiceMethodFor {
  GET: "list";
  POST: "create";
  PUT: "update";
  DELETE: "delete";
}

export type CrudRouteConfig<M extends CrudMethod, TCreate, TUpdate> = {
  /** The HTTP methods to expose; the route file re-exports exactly these. */
  methods: readonly M[];
  /** Resolves the concept's service from the request-scoped cradle. */
  service: (cradle: Cradle) => Pick<CrudService<TCreate, TUpdate>, ServiceMethodFor[M]>;
} & ("POST" extends M ? { createSchema: z.ZodType<TCreate> } : unknown) &
  ("PUT" extends M ? { updateSchema: z.ZodType<TUpdate> } : unknown);

export type MakeCrudRoute = <const M extends CrudMethod, TCreate = never, TUpdate = never>(
  config: CrudRouteConfig<M, TCreate, TUpdate>,
) => Record<M, RouteHandler>;

const idSchema = z.object({ id: z.uuid() });

function idFromQuery(req: Request): string {
  return parseInput(idSchema, { id: new URL(req.url).searchParams.get("id") }).id;
}

/**
 * Builds `makeCrudRoute` for resources that are plain list/create/update/
 * delete. The route file becomes configuration:
 *
 * ```ts
 * export const { GET, POST } = makeCrudRoute({
 *   methods: ["GET", "POST"],
 *   service: ({ favoriteService }) => favoriteService,
 *   createSchema: favoriteCreateSchema,
 * });
 * ```
 *
 * `PUT` and `DELETE` take the record id from the `?id=` query parameter.
 * Workflow endpoints that aren't CRUD use `apiHandler` directly.
 */
export function createMakeCrudRoute(apiHandler: ApiHandler): MakeCrudRoute {
  return <const M extends CrudMethod, TCreate, TUpdate>(
    config: CrudRouteConfig<M, TCreate, TUpdate>,
  ) => {
    // The config type guarantees the service methods and schemas exist for
    // every method in `config.methods`; widen it once to build the handlers.
    const { service, createSchema, updateSchema } = config as unknown as {
      service: (cradle: Cradle) => CrudService<TCreate, TUpdate>;
      createSchema: z.ZodType<TCreate>;
      updateSchema: z.ZodType<TUpdate>;
    };

    const builders: Record<CrudMethod, () => RouteHandler> = {
      GET: () => apiHandler(({ cradle }) => service(cradle).list()),
      POST: () =>
        apiHandler(
          async ({ req, cradle }) =>
            service(cradle).create(parseInput(createSchema, await readJsonBody(req))),
          { status: 201 },
        ),
      PUT: () =>
        apiHandler(async ({ req, cradle }) =>
          service(cradle).update(
            idFromQuery(req),
            parseInput(updateSchema, await readJsonBody(req)),
          ),
        ),
      DELETE: () => apiHandler(({ req, cradle }) => service(cradle).delete(idFromQuery(req))),
    };

    return Object.fromEntries(
      config.methods.map((method) => [method, builders[method]()]),
    ) as Record<M, RouteHandler>;
  };
}
