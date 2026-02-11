import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { CalculateRequestSchema, SizingRequestSchema } from '../middleware/validate.js';
import { calculateFullResult, sensitivityAnalysis, recommendBatterySize } from '../../../src/services/calculations/index.js';
import { buildProfile } from '../services/profile-builder.js';

router.post('/calculate', (req: Request, res: Response, next: NextFunction) => {
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
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/sensitivity', (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = CalculateRequestSchema.parse(req.body);
    const profile = buildProfile(parsed as unknown as { profile: Record<string, unknown> });
    const result = sensitivityAnalysis(
      parsed.battery,
      profile,
      parsed.tariffs,
      parsed.subsidies,
      parsed.financials
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/recommend', (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = SizingRequestSchema.parse(req.body);
    const profile = buildProfile(parsed as unknown as { profile: Record<string, unknown> });
    const result = recommendBatterySize(
      profile,
      parsed.tariffs,
      parsed.subsidies,
      parsed.financials
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
