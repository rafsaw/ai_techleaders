import {
  ApiError,
  CSRF_HEADER,
  type ApiFailure,
  type ApiResult,
  type FieldErrors,
} from "@devmentor/ui/backend/api/types";

export interface ApiCallOptions extends Omit<RequestInit, "body"> {
  /** Serialized as JSON. */
  body?: unknown;
}

function failure(code: string, message: string): ApiFailure {
  return { ok: false, error: { code, message } };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFieldErrors(value: unknown): value is FieldErrors {
  return (
    isRecord(value) &&
    Object.values(value).every(
      (messages) => Array.isArray(messages) && messages.every((m) => typeof m === "string"),
    )
  );
}

function isEnvelope(value: unknown): value is ApiResult<unknown> {
  if (!isRecord(value)) return false;
  if (value.ok === true) return "data" in value;
  if (value.ok !== false || !isRecord(value.error)) return false;

  const { code, message, fieldErrors } = value.error;
  return (
    typeof code === "string" &&
    typeof message === "string" &&
    (fieldErrors === undefined || isFieldErrors(fieldErrors))
  );
}

/** Reads a response body as JSON, returning `undefined` when it is empty or not JSON. */
export async function readJsonSafe(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/**
 * The only sanctioned way for client code to call `/api/*`. Always sends the
 * CSRF header, and turns network failures and malformed responses into a
 * failure result, so callers only ever branch on `ok`.
 */
export async function apiCall<T>(
  path: string,
  { body, headers, ...init }: ApiCallOptions = {},
): Promise<ApiResult<T>> {
  const requestHeaders = new Headers(headers);
  requestHeaders.set("accept", "application/json");
  requestHeaders.set(CSRF_HEADER, "1");
  if (body !== undefined) requestHeaders.set("content-type", "application/json");

  let response: Response;
  try {
    response = await fetch(path, {
      credentials: "same-origin",
      ...init,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    return failure("network_error", "Could not reach the server. Check your connection and try again.");
  }

  const json = await readJsonSafe(response);
  if (!isEnvelope(json)) {
    return failure("invalid_response", `Unexpected response from the server (HTTP ${response.status}).`);
  }
  // The envelope shape is verified above; the payload type is the caller's contract with the route.
  return json as ApiResult<T>;
}

/** Like `apiCall`, but returns the data directly and throws `ApiError` on failure. */
export async function apiCallOrThrow<T>(path: string, options?: ApiCallOptions): Promise<T> {
  const result = await apiCall<T>(path, options);
  if (!result.ok) throw new ApiError(result.error);
  return result.data;
}
