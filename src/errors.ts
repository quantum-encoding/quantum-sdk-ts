import type { APIErrorBody } from "./types.js";

/**
 * APIError is thrown when the API responds with a non-2xx status code.
 */
export class APIError extends Error {
  /** HTTP status code from the response. */
  readonly statusCode: number;

  /** Error type from the API (e.g. "invalid_request", "rate_limit"). */
  readonly code: string;

  /** Unique request identifier from the X-QAI-Request-Id header. */
  readonly requestId: string | undefined;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    requestId?: string,
  ) {
    const msg = requestId
      ? `qai: ${statusCode} ${code}: ${message} (request_id=${requestId})`
      : `qai: ${statusCode} ${code}: ${message}`;

    super(msg);
    this.name = "APIError";
    this.statusCode = statusCode;
    this.code = code;
    this.requestId = requestId;
  }

  /** True if the error is a 429 rate limit response. */
  isRateLimit(): boolean {
    return this.statusCode === 429;
  }

  /** True if the error is a 401 or 403 authentication/authorization failure. */
  isAuth(): boolean {
    return this.statusCode === 401 || this.statusCode === 403;
  }

  /** True if the error is a 404 not found response. */
  isNotFound(): boolean {
    return this.statusCode === 404;
  }
}

/** Check whether an error is a rate limit APIError. */
export function isRateLimitError(err: unknown): err is APIError {
  return err instanceof APIError && err.isRateLimit();
}

/** Check whether an error is an authentication APIError. */
export function isAuthError(err: unknown): err is APIError {
  return err instanceof APIError && err.isAuth();
}

/** Check whether an error is a not found APIError. */
export function isNotFoundError(err: unknown): err is APIError {
  return err instanceof APIError && err.isNotFound();
}

/**
 * Parse an API error response into an APIError.
 * @internal
 */
export async function parseAPIError(
  response: Response,
  requestId: string,
): Promise<APIError> {
  const bodyText = await response.text();

  let code = response.statusText || "Unknown";
  let message = bodyText;

  try {
    const parsed = JSON.parse(bodyText) as APIErrorBody;
    if (parsed.error?.message) {
      message = parsed.error.message;
      if (parsed.error.code) {
        code = parsed.error.code;
      } else if (parsed.error.type) {
        code = parsed.error.type;
      }
    }
  } catch {
    // Body is not JSON — use raw text as message.
  }

  return new APIError(response.status, code, message, requestId || undefined);
}
