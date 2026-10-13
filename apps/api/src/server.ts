import { createApp } from './app.js';
import { env } from './config/env.js';

const app = createApp();

const server = app.listen(env.PORT, '0.0.0.0', () => {
  console.info(`🚀 Lumiere API running on http://0.0.0.0:${env.PORT} in ${env.NODE_ENV} mode`);
});

function gracefulShutdown(signal: string) {
  console.info(`Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    console.info('HTTP server closed.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Forced shutdown due to timeout.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
