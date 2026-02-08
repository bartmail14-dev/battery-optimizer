import { createApp } from './app.js';
import { config } from './config.js';
import { initDatabase } from './db/client.js';

async function main() {
  // Initialize database
  await initDatabase();
  console.log('Database initialized');

  const app = createApp();

  app.listen(config.port, () => {
    console.log(`Battery Optimizer API running on port ${config.port} (${config.nodeEnv})`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
