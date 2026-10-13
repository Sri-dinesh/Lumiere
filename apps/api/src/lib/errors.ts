export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'EMAIL_IN_USE'
  | 'INVALID_CREDENTIALS'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'SEAT_UNAVAILABLE'
  | 'HOLD_ALREADY_ACTIVE'
  | 'HOLD_EXPIRED'
  | 'HOLD_NOT_ACTIVE'
  | 'IDEMPOTENCY_KEY_REUSED'
  | 'SHOW_STARTED'
  | 'SHOW_OVERLAP'
  | 'SHOW_INTERVAL_COLLISION'
  | 'SHOW_HAS_BOOKINGS'
  | 'MOVIE_HAS_BOOKINGS'
  | 'ACTIVE_HOLDS_EXIST'
  | 'CANCELLATION_WINDOW_CLOSED'
  | 'BOOKING_ALREADY_CANCELLED'
  | 'HOLD_ALREADY_CONSUMED'
  | 'CSRF_ORIGIN_MISMATCH'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    statusCode: number,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static badRequest(message: string, details?: Record<string, unknown>): AppError {
    return new AppError('VALIDATION_ERROR', 400, message, details);
  }

  static unauthenticated(message = 'Authentication required'): AppError {
    return new AppError('UNAUTHENTICATED', 401, message);
  }

  static forbidden(message = 'Access forbidden'): AppError {
    return new AppError('FORBIDDEN', 403, message);
  }

  static notFound(message = 'Resource not found'): AppError {
    return new AppError('NOT_FOUND', 404, message);
  }

  static conflict(code: ErrorCode, message: string, details?: Record<string, unknown>): AppError {
    return new AppError(code, 409, message, details);
  }

  static internal(message = 'An unexpected internal error occurred'): AppError {
    return new AppError('INTERNAL_ERROR', 500, message);
  }
}
