import type { AppContainer, Cradle } from "../di/container";
import { RETURN_TO_FALLBACK, parseReturnTo } from "../validators/auth/return-to.schema";
import type { ApiHandlerArgs, RouteHandler } from "./apiHandler";
import { authorize, type Access } from "./auth";
import { ResponseCookies } from "./cookies";
import { isAppError, type AppError } from "./errors";
import { summarizeError } from "./logging";

/** Where a navigation goes: an internal page path, or an allowlisted external URL. */
export type NavigationResult = { redirectTo: string } | { externalUrl: URL };

export interface NavigationHandlerArgs<TParams, A extends Access = Access>
  extends ApiHandlerArgs<TParams, A> {
  /**
   * The request URL, for reading its query string. Never build a redirect or
   * a log line from it: its origin follows the `Host` header and its path or
   * query may carry tokens.
   */
  url: URL;
}

export interface NavigationHandlerOptions<A extends Access = Access> {
  /** Who may call the route (platform PD3). Required: there is no default. */
  access: A;
  /**
   * Static route template for error logs, e.g. `/api/auth/github/callback`.
   * Never pass the request's path. Defaults to the constant label `navigation`.
   */
  logRoute?: string;
  /**
   * Internal destination for an expected `AppError`. Defaults to
   * `/error?code=<code>`. Validated like every internal redirect: an unsafe or
   * reserved destination becomes `/`.
   */
  onError?: (error: AppError) => string;
  /** Origins an `externalUrl` may point at, e.g. `config.github().oauthUrl`. None by default. */
  externalOrigins?: (cradle: Cradle) => readonly (string | URL)[];
}

export type NavigationHandler = <TParams = object, const A extends Access = Access>(
  handler: (args: NavigationHandlerArgs<TParams, A>) => Promise<NavigationResult>,
  options: NavigationHandlerOptions<A>,
) => RouteHandler<TParams>;

export interface NavigationHandlerDeps {
  /** The public application URL (`config.app().url`); redirects never use the `Host` header. */
  appUrl: (cradle: Cradle) => URL;
}

/** Destination of every unexpected navigation failure. */
export const INTERNAL_ERROR_PATH = "/error?code=internal_error";

// A browser navigation cannot carry the CSRF header, so only safe methods are
// served. Next answers HEAD with the GET handler, so HEAD is accepted too.
const NAVIGATION_METHODS = new Set(["GET", "HEAD"]);

/** The shared error page for a known error code. */
export function errorPath(code: string): string {
  return `/error?code=${encodeURIComponent(code)}`;
}

function seeOther(location: string, cookies: ResponseCookies): Response {
  const headers = new Headers({ location });
  cookies.applyTo(headers);
  return new Response(null, { status: 303, headers });
}

/**
 * Builds the `navigationHandler` wrapper for GET routes that answer a browser
 * navigation with a `303` (platform P7), such as the OAuth start and callback.
 * In order:
 *
 * 1. non-GET/HEAD methods get `405` before anything else runs;
 * 2. a per-request container scope and response cookies;
 * 3. principal resolution, so a presented session records activity and
 *    renews its cookie even on public routes;
 * 4. the access rule (401/403 become error redirects);
 * 5. the handler, whose result becomes the redirect;
 * 6. `Set-Cookie` on every redirect, success or failure.
 *
 * Internal destinations pass the `returnTo` validator (platform P6) and are
 * resolved against `appUrl`; external ones must match `externalOrigins`. An
 * `AppError` goes to `onError`; anything else is logged under the static route
 * template and goes to `/error?code=internal_error`. A single-use token in a
 * URL must never authorize an application grant here: consuming it is a POST
 * through `apiHandler`.
 */
export function createNavigationHandler(
  container: AppContainer,
  { appUrl }: NavigationHandlerDeps,
): NavigationHandler {
  return (handler, { access, logRoute = "navigation", onError = (error) => errorPath(error.code), externalOrigins }) =>
    async (req, ctx) => {
      if (!NAVIGATION_METHODS.has(req.method)) {
        return new Response(null, { status: 405, headers: { allow: "GET, HEAD" } });
      }

      const { cradle } = container.createScope();
      const cookies = new ResponseCookies();

      // Never logs the request URL: its path, query or nested returnTo may carry tokens.
      const logError = (message: string, error?: unknown) =>
        cradle.logger.error(message, {
          method: req.method,
          route: logRoute,
          ...(error === undefined ? {} : { error: summarizeError(error) }),
        });

      const internal = (path: string) =>
        new URL(parseReturnTo(path) ?? RETURN_TO_FALLBACK, appUrl(cradle)).href;

      const navigate = async (): Promise<string> => {
        const resolved = await cradle.principalResolver.resolve(req, cookies);
        const principal = authorize(access, resolved);
        const params = await ctx.params;
        const result = await handler({ req, params, cradle, principal, cookies, url: new URL(req.url) });
        if ("redirectTo" in result) return internal(result.redirectTo);

        const allowed = (externalOrigins?.(cradle) ?? []).map((origin) => new URL(origin).origin);
        if (allowed.includes(result.externalUrl.origin)) return result.externalUrl.href;
        // A bug, not user input: the origin is left out of the log on purpose.
        logError("Navigation to an origin outside the allowlist");
        return internal(INTERNAL_ERROR_PATH);
      };

      const recover = (error: unknown): string => {
        try {
          if (isAppError(error)) return internal(onError(error));
          logError("Unhandled navigation error", error);
          return internal(INTERNAL_ERROR_PATH);
        } catch (fallbackError) {
          // Typically APP_URL itself is missing or onError threw: with no
          // trusted origin to resolve against, send a relative Location.
          logError("Navigation error fallback failed", fallbackError);
          return INTERNAL_ERROR_PATH;
        }
      };

      let location: string;
      try {
        location = await navigate();
      } catch (error) {
        location = recover(error);
      }
      return seeOther(location, cookies);
    };
}
