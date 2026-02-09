/**
 * Sensitivity analysis multiplier ranges.
 *
 * Define how much each variable is varied in the tornado chart.
 * low/high are multipliers applied to the base value.
 *
 * Rationale:
 * - Electricity price: asymmetric (−30%/+50%) — upside risk higher due to energy transition
 * - Battery cost: ±25% — reflects current market uncertainty (BloombergNEF 2024)
 * - Discount rate: ±50% — wide range for different risk appetites (3-9% WACC)
 * - Degradation: ×0.5/×2 — large uncertainty depending on usage and chemistry
 * - Price growth: ×0.33/×2 — from near-zero growth to aggressive escalation
 */

export const SENSITIVITY_RANGES = {
  electricityPrice: { low: 0.7, high: 1.5 },
  batteryCost: { low: 0.75, high: 1.25 },
  discountRate: { low: 0.5, high: 1.5 },
  degradation: { low: 0.5, high: 2.0 },
  priceGrowth: { low: 0.33, high: 2.0 },
} as const;
