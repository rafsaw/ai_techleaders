// Client-side declaration of the API's JSON envelope. `@devmentor/core`
// declares the same shape for the server (ui must not import core); keep
// the two in sync.

/** Validation messages keyed by input field name. */
export type FieldErrors = Record<string, string[]>;

export type ApiErrorBody = { code: string; message: string; fieldErrors?: FieldErrors };

export type ApiSuccess<T> = { ok: true; data: T };
export type ApiFailure = { ok: false; error: ApiErrorBody };
export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

/** Must match `CSRF_HEADER` in `@devmentor/core`; the server rejects writes without it. */
export const CSRF_HEADER = "x-devmentor-csrf";

/** Thrown by `apiCallOrThrow` when the API returns a failure envelope. */
export class ApiError extends Error {
  readonly code: string;
  readonly fieldErrors?: FieldErrors;

  constructor({ code, message, fieldErrors }: ApiErrorBody) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}
