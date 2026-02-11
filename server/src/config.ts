export const config = {
  port: parseInt(process.env.PORT ?? '3001', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databasePath: process.env.DATABASE_PATH ?? './data/battery-optimizer.db',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  geminiApiKey: process.env.GEMINI_API_KEY ?? '',
  geminiModel: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash-preview-05-20',
} as const;
