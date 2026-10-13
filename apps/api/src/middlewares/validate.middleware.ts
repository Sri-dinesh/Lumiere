import type { Request, Response, NextFunction } from 'express';
import { z, type ZodSchema } from 'zod';
import { AppError } from '../lib/errors.js';

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join('.') || 'body';
        if (!fieldErrors[path]) fieldErrors[path] = [];
        fieldErrors[path].push(issue.message);
      }
      return next(
        new AppError('VALIDATION_ERROR', 400, 'Invalid request body', { fields: fieldErrors }),
      );
    }
    req.body = result.data;
    next();
  };
}

export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join('.') || 'params';
        if (!fieldErrors[path]) fieldErrors[path] = [];
        fieldErrors[path].push(issue.message);
      }
      return next(
        new AppError('VALIDATION_ERROR', 400, 'Invalid request parameters', {
          fields: fieldErrors,
        }),
      );
    }
    req.params = result.data as Record<string, string>;
    next();
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join('.') || 'query';
        if (!fieldErrors[path]) fieldErrors[path] = [];
        fieldErrors[path].push(issue.message);
      }
      return next(
        new AppError('VALIDATION_ERROR', 400, 'Invalid query parameters', { fields: fieldErrors }),
      );
    }
    Object.defineProperty(req, 'query', {
      value: result.data,
      writable: true,
      enumerable: true,
      configurable: true,
    });
    next();
  };
}
