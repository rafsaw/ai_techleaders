import type { Role } from "../validators/auth/role.schema";
import type { ResponseCookies } from "./cookies";
import { ForbiddenError, UnauthorizedError } from "./errors";

/** The signed-in account behind a request, with its roles as of this request. */
export interface Principal {
  userId: string;
  sessionId: string;
  displayName: string;
  roles: readonly Role[];
}

/**
 * Who may call a route (platform PD3). Every route states it; there is no
 * default, so a forgotten rule is a type error rather than an open endpoint.
 *
 * - `public`: anyone; the handler receives `principal: null` even when a
 *   session is presented (the session still records activity).
 * - `optional`: anyone; the handler receives the principal when signed in.
 * - `user`: any signed-in account, otherwise 401.
 * - `{ role }`: a signed-in account holding that role, otherwise 401/403.
 */
export type Access = "public" | "optional" | "user" | { role: Role };

/** The principal a handler receives for its access rule. */
export type PrincipalFor<A extends Access> = A extends "public"
  ? null
  : A extends "optional"
    ? Principal | null
    : Principal;

/**
 * Resolves the session cookie presented with a request. A valid session
 * records activity and renews its cookie through `cookies`; an invalid or
 * expired one may clear it. Returns null when no valid session is presented,
 * and must not touch the database when no session cookie is present. Throws
 * when resolution itself fails (e.g. the database is down): callers fail
 * closed with a 500, never treat it as signed out.
 */
export interface PrincipalResolver {
  resolve(req: Request, cookies: ResponseCookies): Promise<Principal | null>;
}

declare module "../di/container" {
  interface Cradle {
    /** Resolves the request's session; the app registers the implementation. */
    principalResolver: PrincipalResolver;
  }
}

/**
 * Applies an access rule to the resolved principal: 401 when a signed-in
 * account is required and missing, 403 when it lacks the required role.
 * Returns what the handler receives (`null` on public routes).
 */
export function authorize<A extends Access>(access: A, principal: Principal | null): PrincipalFor<A> {
  if (access === "public") return null as PrincipalFor<A>;
  if (access === "optional") return principal as PrincipalFor<A>;
  if (!principal) throw new UnauthorizedError();
  if (typeof access === "object" && !principal.roles.includes(access.role)) {
    throw new ForbiddenError();
  }
  return principal as PrincipalFor<A>;
}
