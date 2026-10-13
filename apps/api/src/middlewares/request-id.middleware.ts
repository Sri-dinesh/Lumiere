import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const existingId = req.headers['x-request-id'];
  const requestId =
    typeof existingId === 'string' && existingId.length > 0 ? existingId : `req_${randomUUID()}`;

  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}
