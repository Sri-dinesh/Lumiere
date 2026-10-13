import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

interface DatabaseError extends Error {
  code?: string;
  constraint?: string;
  detail?: string;
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const requestId = req.requestId || 'unknown';

  // 1. Handled AppError
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, requestId, path: req.path }, err.message);
    }
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        requestId,
      },
    });
    return;
  }

  // 2. PostgreSQL / Drizzle Database Errors
  const dbErr = err as DatabaseError;
  if (dbErr && typeof dbErr.code === 'string') {
    // 23P01: Exclusion violation (e.g. shows overlapping schedule)
    if (dbErr.code === '23P01') {
      res.status(409).json({
        error: {
          code: 'SHOW_OVERLAP',
          message: 'The scheduled show time overlaps with an existing show on screen 1.',
          requestId,
        },
      });
      return;
    }

    // 23505: Unique constraint violation
    if (dbErr.code === '23505') {
      const constraint = dbErr.constraint || '';
      if (constraint.includes('booking_seats_one_active_ownership_idx')) {
        res.status(409).json({
          error: {
            code: 'SEAT_UNAVAILABLE',
            message: 'One or more selected seats have already been booked.',
            requestId,
          },
        });
        return;
      }
      if (constraint.includes('holds_one_active_per_user_show_idx')) {
        res.status(409).json({
          error: {
            code: 'HOLD_ALREADY_ACTIVE',
            message:
              'You already have an active seat hold for this show. Please complete checkout or wait for it to expire.',
            requestId,
          },
        });
        return;
      }
      if (constraint.includes('users_email_unique') || constraint.includes('users_email')) {
        res.status(409).json({
          error: {
            code: 'EMAIL_IN_USE',
            message: 'An account with this email address already exists.',
            requestId,
          },
        });
        return;
      }
      if (constraint.includes('holds_request_key_uk')) {
        res.status(409).json({
          error: {
            code: 'IDEMPOTENCY_KEY_REUSED',
            message: 'Idempotency key was already used for a different request.',
            requestId,
          },
        });
        return;
      }

      res.status(409).json({
        error: {
          code: 'SEAT_UNAVAILABLE',
          message: 'A conflicting record already exists.',
          requestId,
        },
      });
      return;
    }

    // 23503: Foreign key violation
    if (dbErr.code === '23503') {
      res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'The requested action violates relational constraints.',
          requestId,
        },
      });
      return;
    }
  }

  // 3. Fallback unhandled error
  logger.error({ err, requestId, path: req.path }, 'Unhandled server exception');

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected internal server error occurred.',
      requestId,
    },
  });
}
