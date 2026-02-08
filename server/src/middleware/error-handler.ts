import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation error',
      details: err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  if (err instanceof Error) {
    console.error('[API Error]', err.message, err.stack);
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
    });
    return;
  }

  res.status(500).json({ error: 'Unknown error' });
}
