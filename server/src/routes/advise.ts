import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { CalculateRequestSchema } from '../middleware/validate.js';
import { calculateFullResult } from '../../../src/services/calculations/index.js';
import { buildProfile } from '../services/profile-builder.js';
import { streamAdvisory } from '../services/gemini-advisor.js';
import { config } from '../config.js';

const router = Router();

router.post('/advise', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = CalculateRequestSchema.parse(req.body);
    const profile = buildProfile(parsed as unknown as { profile: Record<string, unknown> });

    // Step 1: Run calculation engine
    const result = calculateFullResult(
      parsed.battery,
      profile,
      parsed.tariffs,
      parsed.subsidies,
      parsed.financials
    );

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // nginx
    res.flushHeaders();

    // Step 2: Send calculation results
    res.write(`event: results\ndata: ${JSON.stringify(result)}\n\n`);

    // Step 3: Stream AI narrative
    if (config.geminiApiKey) {
      try {
        for await (const chunk of streamAdvisory(result)) {
          res.write(`event: narrative\ndata: ${JSON.stringify(chunk)}\n\n`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Gemini fout';
        res.write(`event: narrative_error\ndata: ${JSON.stringify(msg)}\n\n`);
      }
    } else {
      res.write(`event: narrative_error\ndata: ${JSON.stringify('GEMINI_API_KEY niet geconfigureerd')}\n\n`);
    }

    // Step 4: Done
    res.write(`event: done\ndata: {}\n\n`);
    res.end();
  } catch (err) {
    next(err);
  }
});

// Non-streaming endpoint for report generation
router.post('/generate-report', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = CalculateRequestSchema.parse(req.body);
    const profile = buildProfile(parsed as unknown as { profile: Record<string, unknown> });

    const result = calculateFullResult(
      parsed.battery,
      profile,
      parsed.tariffs,
      parsed.subsidies,
      parsed.financials
    );

    if (!config.geminiApiKey) {
      res.status(503).json({ error: 'GEMINI_API_KEY niet geconfigureerd' });
      return;
    }

    let narrative = '';
    for await (const chunk of streamAdvisory(result)) {
      narrative += chunk;
    }

    res.json({ narrative, results: result });
  } catch (err) {
    next(err);
  }
});

export default router;
