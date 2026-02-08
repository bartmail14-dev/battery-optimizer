import { z } from 'zod';

const SectorSchema = z.enum([
  'hospitality', 'healthcare', 'retail', 'kantoor',
  'industrie', 'logistiek', 'onderwijs', 'overig',
]);

export const BatteryConfigSchema = z.object({
  capacityKwh: z.number().positive(),
  powerKw: z.number().positive(),
  roundTripEfficiency: z.number().min(0.5).max(1),
  annualDegradation: z.number().min(0).max(0.2),
  cycleLife: z.number().int().positive(),
  depthOfDischarge: z.number().min(0).max(1),
  costPerKwh: z.number().positive(),
  installationCost: z.number().nonnegative(),
  annualMaintenanceCost: z.number().nonnegative(),
  lifespanYears: z.number().int().positive(),
});

export const EnergyProfileSchema = z.object({
  hourlyConsumptionKwh: z.array(z.number()).length(8760).optional().nullable(),
  peakDemandKw: z.number().nonnegative(),
  annualConsumptionKwh: z.number().positive(),
  connectionCapacityKw: z.number().positive(),
  sector: SectorSchema,
  dataSource: z.enum(['synthetic', 'csv']).optional(),
});

export const TariffStructureSchema = z.object({
  commodityRatePerKwh: z.number().nonnegative(),
  peakRate: z.number().nonnegative(),
  offPeakRate: z.number().nonnegative(),
  networkTariffPerKw: z.number().nonnegative(),
  energyTaxPerKwh: z.number().nonnegative(),
  odeSurchargePerKwh: z.number().nonnegative(),
  feedInTariffPerKwh: z.number().nonnegative(),
  pricingMode: z.enum(['fixed', 'dynamic']),
  hourlyPrices: z.array(z.number()).length(24).optional(),
});

export const SubsidyConfigSchema = z.object({
  sdeEligible: z.boolean(),
  sdeBaseAmount: z.number().nonnegative(),
  eiaPercentage: z.number().min(0).max(1),
  eiaMaxDeduction: z.number().nonnegative(),
});

export const FinancialParamsSchema = z.object({
  discountRate: z.number().min(0).max(1),
  inflationRate: z.number().min(-0.1).max(0.5),
  electricityPriceGrowthRate: z.number().min(-0.1).max(0.5),
  years: z.number().int().min(1).max(50),
});

export const CalculateRequestSchema = z.object({
  battery: BatteryConfigSchema,
  profile: EnergyProfileSchema,
  tariffs: TariffStructureSchema,
  subsidies: SubsidyConfigSchema,
  financials: FinancialParamsSchema,
});

export type CalculateRequest = z.infer<typeof CalculateRequestSchema>;
