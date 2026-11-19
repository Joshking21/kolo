/**
 * Every error the API returns on purpose is an AppError with a code from
 * API.md §1. The error handler (middleware/errorHandler.ts) turns it into:
 *
 *   { "error": { "code", "message", "details", "requestId" } }
 *
 * Usage in a route or service:
 *   throw new AppError(422, "INSUFFICIENT_FUNDS", "Your wallet balance is too low for this payment.");
 *
 * Anything thrown that is NOT an AppError is treated as a bug: it is logged and
 * the client gets a generic 500, so internal details never leak.
 */
export type ErrorCode =
  | "VALIDATION_ERROR"
  | "INVALID_JSON"
  | "IDEMPOTENCY_KEY_MISSING"
  | "UNAUTHENTICATED"
  | "INVALID_CREDENTIALS"
  | "REFRESH_TOKEN_INVALID"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "EMAIL_TAKEN"
  | "PHONE_TAKEN"
  | "ALREADY_MEMBER"
  | "GROUP_FULL"
  | "GROUP_NOT_FORMING"
  | "GROUP_NOT_ACTIVE"
  | "NOT_ENOUGH_MEMBERS"
  | "ADMIN_CANNOT_LEAVE"
  | "ROUND_NOT_COLLECTING"
  | "ALREADY_CONTRIBUTED"
  | "IDEMPOTENCY_IN_PROGRESS"
  | "IDEMPOTENCY_KEY_REUSED"
  | "INSUFFICIENT_FUNDS"
  | "INVALID_INVITE_CODE"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details: unknown = null,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const notFound = (message = "Not found.") => new AppError(404, "NOT_FOUND", message);
