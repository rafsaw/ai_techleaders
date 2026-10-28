import type { AppContainer, Cradle } from "../di/container";
import type { Logger } from "../logger";
import { authorize, type Access, type PrincipalFor } from "./auth";
import { ResponseCookies } from "./cookies";
import { ForbiddenError, isAppError, type FieldErrors, type ValidationError } from "./errors";
import { summarizeError } from "./logging";

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

export interface ApiHandlerArgs<TParams, A extends Access = Access> {
  req: Request;
  params: TParams;
  /** Cradle of a fresh container scope, so `em` is forked per request. */
  cradle: Cradle;
  /** The caller allowed by `access`: always `null` on public routes. */
  principal: PrincipalFor<A>;
  /**
   * Cookies to send with the response, success or error. The session
   * renewal is written first; a handler that starts or ends a session
   * overrides it by writing the same name.
   */
  cookies: ResponseCookies;
}

export interface ApiHandlerOptions<A extends Access = Access> {
  /** Who may call the route (platform PD3). Required: there is no default. */
  access: A;
  /** Status of a successful response. Defaults to 200. */
  status?: number;
  /**
   * Static route template for unexpected-error logs, e.g. `/invite/[token]`.
   * Never pass the request's path: it may carry tokens or a nested `returnTo`.
   * Defaults to the constant label `api`.
   */
  logRoute?: string;
}

export type ApiHandler = <TParams = object, const A extends Access = Access>(
  handler: (args: ApiHandlerArgs<TParams, A>) => Promise<unknown>,
  options: ApiHandlerOptions<A>,
) => RouteHandler<TParams>;

function failure(code: string, message: string, fieldErrors?: FieldErrors): ApiFailure {
  return { ok: false, error: fieldErrors ? { code, message, fieldErrors } : { code, message } };
}

function assertCsrfHeader(req: Request): void {
  if (SAFE_METHODS.has(req.method) || req.headers.has(CSRF_HEADER)) return;
  throw new ForbiddenError("Missing CSRF header");
}

function respond(body: ApiResult<unknown>, status: number, cookies: ResponseCookies): Response {
  const headers = new Headers();
  cookies.applyTo(headers);
  return Response.json(body, { status, headers });
}

function toErrorResponse(
  error: unknown,
  req: Request,
  logger: Logger,
  route: string,
  cookies: ResponseCookies,
): Response {
  if (isAppError(error)) {
    // Not `instanceof ValidationError`: the error may come from another copy of core.
    const fieldErrors = "fieldErrors" in error ? (error as ValidationError).fieldErrors : undefined;
    return respond(failure(error.code, error.message, fieldErrors), error.status, cookies);
  }

  // Anything else is a bug: log a safe summary under the static route
  // template (never the raw URL), and never send details to the client.
  logger.error("Unhandled API error", { method: req.method, route, error: summarizeError(error) });
  return respond(failure("internal_error", "Something went wrong"), 500, cookies);
}

/**
 * Builds the `apiHandler` wrapper every route handler goes through. In order:
 *
 * 1. a per-request container scope;
 * 2. principal resolution, on every route, so a presented session records
 *    activity and renews its cookie even on public routes; a resolver
 *    failure is a 500 (fail closed);
 * 3. the CSRF header check on state-changing methods;
 * 4. the access rule: 401 without a session, 403 without the role;
 * 5. the handler, whose result becomes the JSON envelope;
 * 6. `Set-Cookie` on the success or error response.
 *
 * Thrown `AppError`s map to their status. Routes never write their own
 * try/catch.
 */
export function createApiHandler(container: AppContainer): ApiHandler {
  return (handler, { access, status = 200, logRoute = "api" }) =>
    async (req, ctx) => {
      const { cradle } = container.createScope();
      const cookies = new ResponseCookies();
      try {
        const resolved = await cradle.principalResolver.resolve(req, cookies);
        assertCsrfHeader(req);
        const principal = authorize(access, resolved);
        const data =
          (await handler({ req, params: await ctx.params, cradle, principal, cookies })) ?? null;
        return respond({ ok: true, data }, status, cookies);
      } catch (error) {
        return toErrorResponse(error, req, cradle.logger, logRoute, cookies);
      }
    };
}
