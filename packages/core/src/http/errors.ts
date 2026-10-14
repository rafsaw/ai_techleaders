/** Validation messages keyed by input field name. */
export type FieldErrors = Record<string, string[]>;

/**
 * Base class for expected, domain-level failures (as opposed to bugs).
 * Services throw these; `apiHandler` maps them to an HTTP status and the
 * JSON error envelope. A service never builds a response itself.
 */
export class AppError extends Error {
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
