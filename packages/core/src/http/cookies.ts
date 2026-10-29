import { parseCookie, stringifySetCookie } from "cookie";

export interface CookieOptions {
  /**
   * Required so no caller forgets it: `true` whenever the app is served over
   * HTTPS (derive it from `APP_URL`). Production always uses HTTPS.
   */
  secure: boolean;
  /** Lifetime in seconds. Omit for a browser-session cookie. */
  maxAge?: number;
  /** Defaults to `/`. */
  path?: string;
  /** Defaults to `true`: scripts cannot read the cookie. */
  httpOnly?: boolean;
  /** Defaults to `lax`. `none` requires `secure`. */
  sameSite?: "lax" | "strict" | "none";
}

export type CookieDeleteOptions = Omit<CookieOptions, "maxAge">;

const EPOCH = new Date(0);

function assertValidOptions(name: string, options: CookieOptions & { path: string }): void {
  if (options.sameSite === "none" && !options.secure) {
    throw new TypeError(`Cookie "${name}" uses SameSite=None and must be Secure`);
  }
  if (name.startsWith("__Secure-") && !options.secure) {
    throw new TypeError(`Cookie "${name}" has the __Secure- prefix and must be Secure`);
  }
  if (name.startsWith("__Host-") && (!options.secure || options.path !== "/")) {
    throw new TypeError(`Cookie "${name}" has the __Host- prefix and must be Secure with Path=/`);
  }
}

/**
 * The `Set-Cookie` headers a handler wants on its response. Framework-agnostic:
 * the HTTP wrappers apply them to the Web `Response` themselves (platform P3).
 * A name is written once per response; a later `set`/`delete` of the same name
 * replaces the earlier one, so starting or ending a session overrides the
 * renewal of the old cookie.
 */
export class ResponseCookies {
  readonly #headers = new Map<string, string>();

  set(name: string, value: string, options: CookieOptions): this {
    return this.#write(name, value, options);
  }

  /** Expires the cookie in the browser. Use the same path/flags it was set with. */
  delete(name: string, options: CookieDeleteOptions): this {
    // Max-Age=0 is enough for current browsers; Expires covers older ones.
    return this.#write(name, "", { ...options, maxAge: 0, expires: EPOCH });
  }

  #write(name: string, value: string, options: CookieOptions & { expires?: Date }): this {
    const resolved = {
      ...options,
      httpOnly: options.httpOnly ?? true,
      sameSite: options.sameSite ?? "lax",
      path: options.path ?? "/",
    };
    assertValidOptions(name, resolved);
    this.#headers.set(name, stringifySetCookie({ name, value, ...resolved }));
    return this;
  }

  has(name: string): boolean {
    return this.#headers.has(name);
  }

  /** Serialized `Set-Cookie` header values, in first-write order. */
  toHeaderValues(): string[] {
    return [...this.#headers.values()];
  }

  /** Appends every pending cookie to `headers` as its own `Set-Cookie` line. */
  applyTo(headers: Headers): void {
    for (const value of this.#headers.values()) headers.append("set-cookie", value);
  }
}

/** Reads one cookie from a request's `Cookie` header. Empty values count as absent. */
export function readCookie(source: Request | Headers, name: string): string | undefined {
  const headers = source instanceof Headers ? source : source.headers;
  const header = headers.get("cookie");
  if (!header) return undefined;
  return parseCookie(header)[name] || undefined;
}
