import { generateHourlyProfile } from '../../../src/services/calculations/profile-generator.js';
import type { EnergyProfile } from '../../../src/types/index.js';

export function buildProfile(parsed: { profile: Record<string, unknown> }): EnergyProfile {
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
