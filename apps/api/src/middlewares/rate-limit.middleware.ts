import rateLimit from 'express-rate-limit';
import { AppError } from '../lib/errors.js';
import { env } from '../config/env.js';

export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: env.NODE_ENV === 'test' ? 1000 : 15, // 15 attempts/min for normal, generous in test
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(
      new AppError(
        'RATE_LIMITED',
        429,
        'Too many authentication attempts. Please try again later.',
      ),
    );
  },
});
