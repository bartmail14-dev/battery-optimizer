import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { CalculateRequestSchema, SizingRequestSchema } from '../middleware/validate.js';
import { calculateFullResult, sensitivityAnalysis, recommendBatterySize } from '../../../src/services/calculations/index.js';
import { generateHourlyProfile } from '../../../src/services/calculations/profile-generator.js';
import type { EnergyProfile } from '../../../src/types/index.js';

const router = Router();

function buildProfile(parsed: { profile: Record<string, unknown> }): EnergyProfile {
  const p = parsed.profile as {
    hourlyConsumptionKwh?: number[] | null;
    peakDemandKw: number;
    annualConsumptionKwh: number;
    connectionCapacityKw: number;
    sector: 'hospitality' | 'healthcare' | 'retail' | 'kantoor' | 'industrie' | 'logistiek' | 'onderwijs' | 'overig';
    dataSource?: 'synthetic' | 'csv';
  };

  const hourlyConsumptionKwh = p.hourlyConsumptionKwh && p.hourlyConsumptionKwh.length > 0
    ? p.hourlyConsumptionKwh
    : generateHourlyProfile(p.annualConsumptionKwh, p.peakDemandKw, p.sector);

  return {
    hourlyConsumptionKwh,
    peakDemandKw: p.peakDemandKw,
    annualConsumptionKwh: p.annualConsumptionKwh,
    connectionCapacityKw: p.connectionCapacityKw,
    sector: p.sector,
    dataSource: p.dataSource ?? 'synthetic',
  };
}

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
