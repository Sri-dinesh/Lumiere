import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { sql } from 'drizzle-orm';
import { db } from './db/client.js';
import { requestIdMiddleware } from './middlewares/request-id.middleware.js';
import { originGuardForMutations } from './middlewares/origin-guard.middleware.js';
import { resolveAuth, requireAuth, requireAdmin } from './middlewares/auth.middleware.js';
import { notFoundMiddleware } from './middlewares/not-found.middleware.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { movieRouter } from './modules/movies/movie.routes.js';
import { showRouter } from './modules/shows/show.routes.js';
import { holdRouter } from './modules/holds/hold.routes.js';
import { bookingRouter } from './modules/bookings/booking.routes.js';
import { adminRouter } from './modules/admin/admin.routes.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // Core observability and security middlewares
  app.use(requestIdMiddleware);
  app.use(helmet());
  app.use(express.json({ limit: '32kb' }));
  app.use(cookieParser());
  app.use(originGuardForMutations);
  app.use(resolveAuth);

  // Health checks
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/v1/health/ready', async (_req, res, next) => {
    try {
      await db.execute(sql`SELECT 1`);
      res.json({
        data: {
          status: 'ready',
          database: 'connected',
        },
        meta: {
          requestId: _req.requestId,
        },
      });
    } catch (err) {
      next(err);
    }
  });

  // Feature routers
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/movies', movieRouter);
  app.use('/api/v1/shows', showRouter);
  app.use('/api/v1/holds', holdRouter);
  app.use('/api/v1/bookings', bookingRouter);
  app.use('/api/v1/admin', requireAuth, requireAdmin, adminRouter);

  // 404 handler for unmatched routes
  app.use(notFoundMiddleware);

  // Central error handler
  app.use(errorHandler);

  return app;
}
