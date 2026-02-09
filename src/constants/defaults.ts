/**
 * Default configuration values for initial form state.
 *
 * These serve as sensible starting points — all values are overridable by the user.
 * Bron: COMCAM marktanalyse 2024, NVDE batterijmonitor
 */
import type { BatteryConfig, TariffStructure, SubsidyConfig, FinancialParams } from '../types';
import {
  DEFAULT_DISCOUNT_RATE,
  DEFAULT_INFLATION_RATE,
  DEFAULT_ELECTRICITY_PRICE_GROWTH,
  DEFAULT_ANALYSIS_YEARS,
  EPEX_TYPICAL_PROFILE,
} from './dutch-energy-market';

/** Default battery configuration — typical 100 kWh commercial system */
export const DEFAULT_BATTERY: BatteryConfig = {
  capacityKwh: 100,
  powerKw: 50,
  roundTripEfficiency: 0.89,
  annualDegradation: 0.025,
  cycleLife: 6000,
  depthOfDischarge: 0.9,
  costPerKwh: 550,
  installationCost: 15000,
  annualMaintenanceCost: 2000,
  lifespanYears: 15,
};

/** Default tariff structure — typical Dutch commercial rates 2024 */
export const DEFAULT_TARIFFS: TariffStructure = {
  commodityRatePerKwh: 0.12,
  peakRate: 0.22,
  offPeakRate: 0.14,
  networkTariffPerKw: 27.5,
  energyTaxPerKwh: 0.01312,
  odeSurchargePerKwh: 0.00642,
  feedInTariffPerKwh: 0.07,
  pricingMode: 'dynamic',
  hourlyPrices: EPEX_TYPICAL_PROFILE,
};

/** Default subsidy configuration — SDE++ eligible with standard EIA */
export const DEFAULT_SUBSIDIES: SubsidyConfig = {
  sdeEligible: true,
  sdeBaseAmount: 0.068,
  eiaPercentage: 0.455,
  eiaMaxDeduction: 136000000,
};

/** Default financial parameters */
export const DEFAULT_FINANCIALS: FinancialParams = {
  discountRate: DEFAULT_DISCOUNT_RATE,
  inflationRate: DEFAULT_INFLATION_RATE,
  electricityPriceGrowthRate: DEFAULT_ELECTRICITY_PRICE_GROWTH,
  years: DEFAULT_ANALYSIS_YEARS,
};

/** Default energy profile parameters — typical mid-sized commercial building */
export const DEFAULT_PROFILE = {
  annualConsumptionKwh: 200_000,
  peakDemandKw: 80,
  connectionCapacityKw: 100,
} as const;
