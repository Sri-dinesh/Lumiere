import { pino } from 'pino';
import { env } from '../config/env.js';

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: [
    'req.headers.cookie',
    'req.headers.authorization',
    'res.headers["set-cookie"]',
    'password',
    'token',
    'tokenHash',
    'passwordHash',
  ],
  transport:
    env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});
