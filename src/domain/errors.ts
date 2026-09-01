export type ApiErrorCode =
  | "unauthorized"
  | "forbidden"
  | "invalid_input"
  | "conflict"
  | "not_found"
  | "rate_limited"
  | "betting_closed"
  | "insufficient_credits"
  | "account_suspended"
  | "idempotent_replay"
  | "crash_already_occurred"
  | "internal";

export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    public readonly status: number,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function jsonError(error: unknown): { body: object; status: number } {
  if (error instanceof ApiError) {
    return {
      status: error.status,
      body: { error: { code: error.code, message: error.message, details: error.details ?? null } },
    };
  }
  return {
    status: 500,
    body: { error: { code: "internal", message: "Request could not be completed." } },
  };
}
