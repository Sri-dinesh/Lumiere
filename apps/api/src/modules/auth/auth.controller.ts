import type { Request, Response, NextFunction } from 'express';
import { authService, AuthService } from './auth.service.js';
import {
  setSessionCookie,
  clearSessionCookie,
  getSessionTokenFromRequest,
} from '../../lib/cookies.js';
import { AppError } from '../../lib/errors.js';

export class AuthController {
  constructor(private readonly service: AuthService = authService) {}

  signup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { user, rawToken } = await this.service.signup(req.body);
      setSessionCookie(res, rawToken);
      res.status(201).json({
        data: { user },
        meta: { requestId: req.requestId },
      });
    } catch (err) {
      next(err);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { user, rawToken } = await this.service.login(req.body);
      setSessionCookie(res, rawToken);
      res.status(200).json({
        data: { user },
        meta: { requestId: req.requestId },
      });
    } catch (err) {
      next(err);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rawToken = getSessionTokenFromRequest(req);
      await this.service.logout(rawToken);
      clearSessionCookie(res);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.auth) {
        throw new AppError('UNAUTHENTICATED', 401, 'Please sign in to access your profile.');
      }
      const user = await this.service.getMe(req.auth.userId);
      res.status(200).json({
        data: { user },
        meta: { requestId: req.requestId },
      });
    } catch (err) {
      next(err);
    }
  };
}

export const authController = new AuthController();
