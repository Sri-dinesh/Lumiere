import type { Request, Response } from 'express';
import { env } from '../config/env.js';
import { SESSION_COOKIE_NAME } from '../config/constants.js';

export function getCookieName(): string {
  return env.NODE_ENV === 'production' ? `__Host-${SESSION_COOKIE_NAME}` : SESSION_COOKIE_NAME;
}

export function setSessionCookie(res: Response, rawToken: string): void {
  const cookieName = getCookieName();
  const isProd = env.NODE_ENV === 'production';

  res.cookie(cookieName, rawToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: env.SESSION_TTL_SECONDS * 1000,
  });
}

export function clearSessionCookie(res: Response): void {
  const cookieName = getCookieName();
  const isProd = env.NODE_ENV === 'production';

  res.clearCookie(cookieName, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
  });

  // Also clear fallback name if transitioning environments
  if (isProd) {
    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
    });
  }
}

export function getSessionTokenFromRequest(req: Request): string | null {
  const primaryName = getCookieName();
  if (req.cookies && req.cookies[primaryName]) {
    return req.cookies[primaryName];
  }
  if (req.cookies && req.cookies[SESSION_COOKIE_NAME]) {
    return req.cookies[SESSION_COOKIE_NAME];
  }
  return null;
}
