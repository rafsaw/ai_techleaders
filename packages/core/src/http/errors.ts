/** Validation messages keyed by input field name. */
export type FieldErrors = Record<string, string[]>;

/**
 * Brand shared by every copy of this module. Next.js may load
 * `@devmentor/core` once per bundle (a page and a route handler), while the
 * process-wide container, and every service that throws, is built from
 * whichever copy ran first; `instanceof AppError` then fails across copies.
 */
const APP_ERROR: unique symbol = Symbol.for("@devmentor/core/AppError");

/**
 * Base class for expected, domain-level failures (as opposed to bugs).
 * Services throw these; `apiHandler` maps them to an HTTP status and the
 * JSON error envelope. A service never builds a response itself. Detect them
 * with `isAppError`, never `instanceof`: see `APP_ERROR`.
 */
export class AppError extends Error {
  readonly [APP_ERROR] = true;

  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = new.target.name;
  }
}

/** Whether `value` is an `AppError` from any copy of this module. */
export function isAppError(value: unknown): value is AppError {
  return typeof value === "object" && value !== null && (value as Partial<AppError>)[APP_ERROR] === true;
}

export class ValidationError extends AppError {
  constructor(
    readonly fieldErrors: FieldErrors,
    message = "Invalid input",
    options?: ErrorOptions,
  ) {
    super(message, "validation_error", 400, options);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required", options?: ErrorOptions) {
    super(message, "unauthorized", 401, options);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden", options?: ErrorOptions) {
    super(message, "forbidden", 403, options);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found", options?: ErrorOptions) {
    super(message, "not_found", 404, options);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict", options?: ErrorOptions) {
    super(message, "conflict", 409, options);
  }
}
