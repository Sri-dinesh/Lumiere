import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import { SESSION_COOKIE_NAME } from '../config/constants.js';
import { AppError } from '../lib/errors.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function originGuardForMutations(req: Request, _res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  // Only enforce origin guard if a session cookie is present (cookie-authenticated write request)
  const hasSessionCookie = Boolean(
    req.cookies?.[SESSION_COOKIE_NAME] || req.cookies?.[`__Host-${SESSION_COOKIE_NAME}`],
  );
  if (!hasSessionCookie) {
    return next();
  }

  const originHeader = req.headers.origin;
  const refererHeader = req.headers.referer;

  let requestOrigin: string | null = null;
  if (originHeader) {
    requestOrigin = originHeader;
  } else if (refererHeader) {
    try {
      const url = new URL(refererHeader);
      requestOrigin = url.origin;
    } catch {
      requestOrigin = null;
    }
  }

  // Allow in test or non-browser tooling when no Origin/Referer is sent
  if (!requestOrigin && env.NODE_ENV === 'test') {
    return next();
  }

  const allowedOrigins = [env.PUBLIC_WEB_ORIGIN];
  if (env.NODE_ENV !== 'production') {
    allowedOrigins.push('http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:4000');
  }

  if (!requestOrigin || !allowedOrigins.includes(requestOrigin)) {
    return next(
      new AppError(
        'CSRF_ORIGIN_MISMATCH',
        403,
        `Cross-origin mutation rejected from origin: ${requestOrigin || 'unknown'}`,
      ),
    );
  }

  next();
}
