import { Router } from 'express';
import { authController } from './auth.controller.js';
import { signupSchema, loginSchema } from './auth.schema.js';
import { validateBody } from '../../middlewares/validate.middleware.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { authRateLimiter } from '../../middlewares/rate-limit.middleware.js';

export const authRouter = Router();

authRouter.post('/signup', authRateLimiter, validateBody(signupSchema), authController.signup);
authRouter.post('/login', authRateLimiter, validateBody(loginSchema), authController.login);
authRouter.post('/logout', authController.logout);
authRouter.get('/me', requireAuth, authController.getMe);
