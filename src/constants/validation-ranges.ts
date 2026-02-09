/**
 * Input validation ranges for the BatteryConfigurator form.
 *
 * Centralized to avoid magic numbers scattered in Zod schemas.
 * These represent physical and market-realistic bounds, not business rules.
 */

export const VALIDATION = {
  battery: {
    capacityKwh: { min: 10, max: 10_000 },
    powerKw: { min: 5, max: 5_000 },
    roundTripEfficiency: { min: 0.70, max: 0.99 },
    annualDegradation: { min: 0.005, max: 0.10 },
    cycleLife: { min: 1_000, max: 20_000 },
    depthOfDischarge: { min: 0.5, max: 1.0 },
    costPerKwh: { min: 100, max: 2_000 },
    installationCost: { min: 0, max: 500_000 },
    annualMaintenanceCost: { min: 0, max: 100_000 },
    lifespanYears: { min: 5, max: 30 },
  },
  profile: {
    annualConsumptionKwh: { min: 10_000, max: 50_000_000 },
    peakDemandKw: { min: 10, max: 10_000 },
    connectionCapacityKw: { min: 10, max: 10_000 },
  },
} as const;
