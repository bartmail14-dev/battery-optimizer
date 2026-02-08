import express from 'express';
import cors from 'cors';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { errorHandler } from './middleware/error-handler.js';
import healthRouter from './routes/health.js';
import calculateRouter from './routes/calculate.js';
import profilesRouter from './routes/profiles.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

  // Serve frontend in production
  if (config.nodeEnv === 'production') {
    const distPath = path.resolve(__dirname, '../../dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}
