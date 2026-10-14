import type { AppContainer, Cradle } from "../di/container";
import type { Logger } from "../logger";
import { AppError, ForbiddenError, ValidationError, type FieldErrors } from "./errors";

// The JSON envelope every API route returns. `@devmentor/ui` declares the
// same shape for its client; keep the two in sync.
export type ApiSuccess<T> = { ok: true; data: T };
export type ApiFailure = {
  ok: false;
  error: { code: string; message: string; fieldErrors?: FieldErrors };
};
export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

/**
 * Header every state-changing request must carry. A cross-site HTML form
 * post can't set custom headers, so together with `sameSite` cookies this is
 * the CSRF defense. `apiCall` in `@devmentor/ui` always sends it.
 */
export const CSRF_HEADER = "x-devmentor-csrf";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export type RouteHandler<TParams = object> = (
  req: Request,
  ctx: { params: Promise<TParams> },
) => Promise<Response>;

export interface ApiHandlerArgs<TParams> {
  req: Request;
  params: TParams;
  /** Cradle of a fresh container scope, so `em` is forked per request. */
  cradle: Cradle;
}

export interface ApiHandlerOptions {
  /** Status of a successful response. Defaults to 200. */
  status?: number;
}

export type ApiHandler = <TParams = object>(
  handler: (args: ApiHandlerArgs<TParams>) => Promise<unknown>,
  options?: ApiHandlerOptions,
) => RouteHandler<TParams>;

function failure(code: string, message: string, fieldErrors?: FieldErrors): ApiFailure {
  return { ok: false, error: fieldErrors ? { code, message, fieldErrors } : { code, message } };
}

function assertCsrfHeader(req: Request): void {
  if (SAFE_METHODS.has(req.method) || req.headers.has(CSRF_HEADER)) return;
  throw new ForbiddenError("Missing CSRF header");
}

function toErrorResponse(error: unknown, req: Request, logger: Logger): Response {
  if (error instanceof AppError) {
    const fieldErrors = error instanceof ValidationError ? error.fieldErrors : undefined;
    return Response.json(failure(error.code, error.message, fieldErrors), {
      status: error.status,
    });
  }

  // Anything else is a bug: log the details, never send them to the client.
  logger.error("Unhandled API error", { method: req.method, url: req.url, error });
  return Response.json(failure("internal_error", "Something went wrong"), { status: 500 });
}

/**
 * Builds the `apiHandler` wrapper every route handler goes through: CSRF
 * check, a per-request container scope, the JSON envelope, and the mapping
 * from thrown `AppError`s to status codes. Routes never write their own
 * try/catch.
 */
export function createApiHandler(container: AppContainer): ApiHandler {
  return (handler, { status = 200 } = {}) =>
    async (req, ctx) => {
      const { cradle } = container.createScope();
      try {
        assertCsrfHeader(req);
        const data = (await handler({ req, params: await ctx.params, cradle })) ?? null;
        return Response.json({ ok: true, data } satisfies ApiSuccess<unknown>, { status });
      } catch (error) {
        return toErrorResponse(error, req, cradle.logger);
      }
    };
}
