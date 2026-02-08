export const config = {
  port: parseInt(process.env.PORT ?? '3001', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databasePath: process.env.DATABASE_PATH ?? './data/battery-optimizer.db',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
} as const;
