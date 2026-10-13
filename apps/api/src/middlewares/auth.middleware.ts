import { createHash } from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { eq, and, isNull, gt, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { sessions, users } from '../db/schema/index.js';
import { getSessionTokenFromRequest } from '../lib/cookies.js';
import { AppError } from '../lib/errors.js';

export function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

export async function resolveAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = getSessionTokenFromRequest(req);
  if (!token) {
    return next();
  }

  const tokenHash = hashToken(token);

  try {
    const result = await db
      .select({
        sessionId: sessions.id,
        userId: users.id,
        role: users.role,
        email: users.email,
        expiresAt: sessions.expiresAt,
        revokedAt: sessions.revokedAt,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(
        and(
          eq(sessions.tokenHash, tokenHash),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, sql`clock_timestamp()`),
        ),
      )
      .limit(1);

    const session = result[0];
    if (session) {
      req.auth = {
        userId: session.userId,
        role: session.role,
        email: session.email,
      };
    }
  } catch (err) {
    // Session lookup failure should not crash but proceed unauthenticated
  }

  next();
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.auth) {
    await resolveAuth(req, res, () => {
      if (!req.auth) {
        return next(
          new AppError('UNAUTHENTICATED', 401, 'Please sign in to access this resource.'),
        );
      }
      next();
    });
    return;
  }
  next();
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.auth) {
    return next(new AppError('UNAUTHENTICATED', 401, 'Please sign in to access this resource.'));
  }
  if (req.auth.role !== 'ADMIN') {
    return next(new AppError('FORBIDDEN', 403, 'Administrator privileges required.'));
  }
  next();
}
