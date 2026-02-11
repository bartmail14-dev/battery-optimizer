import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { config } from './config.js';
import { errorHandler } from './middleware/error-handler.js';
import healthRouter from './routes/health.js';
import calculateRouter from './routes/calculate.js';
import profilesRouter from './routes/profiles.js';
import adviseRouter from './routes/advise.js';

export function createApp() {
  const app = express();

  // Middleware
  app.use(cors({ origin: config.corsOrigin }));
  app.use(compression());
  app.use(express.json({ limit: '5mb' })); // 8760 hourly values can be ~70KB

  // API routes
  app.use('/api', healthRouter);
  app.use('/api', calculateRouter);
  app.use('/api', profilesRouter);
  app.use('/api', adviseRouter);

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}
