export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_JSON'
  | 'IDEMPOTENCY_KEY_MISSING'
  | 'UNAUTHENTICATED'
  | 'INVALID_CREDENTIALS'
  | 'REFRESH_TOKEN_INVALID'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'EMAIL_TAKEN'
  | 'PHONE_TAKEN'
  | 'ALREADY_MEMBER'
  | 'GROUP_FULL'
  | 'GROUP_NOT_FORMING'
  | 'GROUP_NOT_ACTIVE'
  | 'NOT_ENOUGH_MEMBERS'
  | 'ADMIN_CANNOT_LEAVE'
  | 'ROUND_NOT_COLLECTING'
  | 'ALREADY_CONTRIBUTED'
  | 'IDEMPOTENCY_IN_PROGRESS'
  | 'IDEMPOTENCY_KEY_REUSED'
  | 'INSUFFICIENT_FUNDS'
  | 'INVALID_INVITE_CODE'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'NETWORK_ERROR';

export type ValidationErrorDetail = {
  path: string;
  message: string;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly details: ValidationErrorDetail[] | null;
  readonly requestId: string | null;
  readonly retryAfterSeconds: number | null;

  constructor(opts: {
    status: number;
    code: ErrorCode;
    message: string;
    details?: ValidationErrorDetail[] | null;
    requestId?: string | null;
    retryAfterSeconds?: number | null;
  }) {
    super(opts.message);
    this.name = 'ApiError';
    this.status = opts.status;
    this.code = opts.code;
    this.details = opts.details ?? null;
    this.requestId = opts.requestId ?? null;
    this.retryAfterSeconds = opts.retryAfterSeconds ?? null;
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

function humanizeSeconds(seconds: number): string {
  if (seconds <= 1) return '1 second';
  if (seconds < 60) return `${seconds} seconds`;
  const minutes = Math.ceil(seconds / 60);
  if (minutes === 1) return '1 minute';
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.ceil(seconds / 3600);
  return hours === 1 ? '1 hour' : `${hours} hours`;
}

export function messageFor(error: unknown): string {
  if (!isApiError(error)) {
    return 'Something went wrong on our side. Please try again.';
  }

  switch (error.code) {
    case 'VALIDATION_ERROR':
      return 'Some details need fixing. Check the highlighted fields.';
    case 'INVALID_JSON':
    case 'INTERNAL_ERROR':
    case 'IDEMPOTENCY_KEY_MISSING':
    case 'IDEMPOTENCY_KEY_REUSED':
      return 'Something went wrong on our side. Please try again.';
    case 'NETWORK_ERROR':
      return "Can't reach Kolo. Check your connection and try again.";
    case 'UNAUTHENTICATED':
    case 'REFRESH_TOKEN_INVALID':
      return 'Your session has ended. Please log in again.';
    case 'INVALID_CREDENTIALS':
      return "That email and password don't match.";
    case 'FORBIDDEN':
      return 'Only the group admin can do that.';
    case 'NOT_FOUND':
      return "We couldn't find that. It may have been removed, or you may not have access.";
    case 'EMAIL_TAKEN':
      return 'An account with this email already exists.';
    case 'PHONE_TAKEN':
      return 'An account with this phone number already exists.';
    case 'ALREADY_MEMBER':
      return "You're already in this group.";
    case 'GROUP_FULL':
      return 'This group is full.';
    case 'GROUP_NOT_FORMING':
      return "This group has already started, so that's no longer possible.";
    case 'GROUP_NOT_ACTIVE':
      return "This group isn't active.";
    case 'NOT_ENOUGH_MEMBERS':
      return 'A group needs at least 2 members to start.';
    case 'ADMIN_CANNOT_LEAVE':
      return "As the admin, you can't leave. Cancel the group instead.";
    case 'ROUND_NOT_COLLECTING':
      return "This round isn't taking payments.";
    case 'ALREADY_CONTRIBUTED':
      return "You've already paid into this round.";
    case 'IDEMPOTENCY_IN_PROGRESS':
      return 'Your payment is still processing. Give it a moment.';
    case 'INSUFFICIENT_FUNDS':
      return "You don't have enough in your wallet. Add money and try again.";
    case 'INVALID_INVITE_CODE':
      return "That invite code doesn't match any group.";
    case 'RATE_LIMITED': {
      const waitTime = error.retryAfterSeconds != null ? humanizeSeconds(error.retryAfterSeconds) : 'a few moments';
      return `Too many attempts. Try again in ${waitTime}.`;
    }
    default:
      return 'Something went wrong on our side. Please try again.';
  }
}
