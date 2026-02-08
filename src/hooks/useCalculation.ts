import { useState, useCallback, useMemo } from 'react';
import type {
  BatteryConfig,
  EnergyProfile,
  TariffStructure,
  SubsidyConfig,
  FinancialParams,
  CalculationResult,
  Scenario,
  DashboardState,
  Sector,
} from '../types';
import { calculateViaAPI, sensitivityViaAPI } from '../services/api/api-client';
import { generateHourlyProfile } from '../services/calculations/profile-generator';
import type { SensitivityDataPoint } from '../types';
import {
  DEFAULT_DISCOUNT_RATE,
  DEFAULT_INFLATION_RATE,
  DEFAULT_ELECTRICITY_PRICE_GROWTH,
  DEFAULT_ANALYSIS_YEARS,
  EPEX_TYPICAL_PROFILE,
} from '../constants';

const DEFAULT_BATTERY: BatteryConfig = {
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

const DEFAULT_TARIFFS: TariffStructure = {
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

const DEFAULT_SUBSIDIES: SubsidyConfig = {
  sdeEligible: true,
  sdeBaseAmount: 0.068,
  eiaPercentage: 0.455,
  eiaMaxDeduction: 136000000,
};

const DEFAULT_FINANCIALS: FinancialParams = {
  discountRate: DEFAULT_DISCOUNT_RATE,
  inflationRate: DEFAULT_INFLATION_RATE,
  electricityPriceGrowthRate: DEFAULT_ELECTRICITY_PRICE_GROWTH,
  years: DEFAULT_ANALYSIS_YEARS,
};

export { generateHourlyProfile } from '../services/calculations/profile-generator';

export function useCalculation() {
  const [batteryConfig, setBatteryConfig] = useState<BatteryConfig>(DEFAULT_BATTERY);
  const [tariffs, setTariffs] = useState<TariffStructure>(DEFAULT_TARIFFS);
  const [subsidies, setSubsidies] = useState<SubsidyConfig>(DEFAULT_SUBSIDIES);
  const [financials, setFinancials] = useState<FinancialParams>(DEFAULT_FINANCIALS);
  const [sector, setSector] = useState<Sector>('hospitality');
  const [annualConsumption, setAnnualConsumption] = useState(200000);
  const [peakDemand, setPeakDemand] = useState(80);
  const [connectionCapacity, setConnectionCapacity] = useState(100);
  const [selectedScenario, setSelectedScenario] = useState<Scenario>('base');
  const [results, setResults] = useState<CalculationResult | null>(null);
  const [sensitivity, setSensitivity] = useState<SensitivityDataPoint[] | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customHourlyProfile, setCustomHourlyProfile] = useState<number[] | null>(null);

  const energyProfile = useMemo<EnergyProfile>(() => ({
    hourlyConsumptionKwh: customHourlyProfile ?? generateHourlyProfile(annualConsumption, peakDemand, sector),
    peakDemandKw: peakDemand,
    annualConsumptionKwh: annualConsumption,
    connectionCapacityKw: connectionCapacity,
    sector,
    dataSource: customHourlyProfile ? 'csv' : 'synthetic',
  }), [annualConsumption, peakDemand, connectionCapacity, sector, customHourlyProfile]);

  const calculate = useCallback(async (overrides?: {
    batteryConfig?: BatteryConfig;
    energyProfile?: EnergyProfile;
    tariffs?: TariffStructure;
    subsidies?: SubsidyConfig;
    financials?: FinancialParams;
  }) => {
    setIsCalculating(true);
    setError(null);

    // Use overrides if provided (avoids stale closure when called right after setState)
    const bat = overrides?.batteryConfig ?? batteryConfig;
    const prof = overrides?.energyProfile ?? energyProfile;
    const tar = overrides?.tariffs ?? tariffs;
    const sub = overrides?.subsidies ?? subsidies;
    const fin = overrides?.financials ?? financials;

    try {
      const [result, sensitivityData] = await Promise.all([
        calculateViaAPI(bat, prof, tar, sub, fin),
        sensitivityViaAPI(bat, prof, tar, sub, fin),
      ]);
      setResults(result);
      setSensitivity(sensitivityData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Berekening mislukt';
      setError(message);
      console.error('Calculation failed:', err);
    } finally {
      setIsCalculating(false);
    }
  }, [batteryConfig, energyProfile, tariffs, subsidies, financials]);

  const dashboardState: DashboardState = {
    batteryConfig,
    energyProfile,
    tariffs,
    subsidies,
    financialParams: financials,
    selectedScenario,
    results,
  };

  return {
    // State
    batteryConfig,
    tariffs,
    subsidies,
    financials,
    sector,
    annualConsumption,
    peakDemand,
    connectionCapacity,
    selectedScenario,
    results,
    sensitivity,
    isCalculating,
    error,
    energyProfile,
    dashboardState,
    customHourlyProfile,

    // Setters
    setBatteryConfig,
    setTariffs,
    setSubsidies,
    setFinancials,
    setSector,
    setAnnualConsumption,
    setPeakDemand,
    setConnectionCapacity,
    setSelectedScenario,
    setCustomHourlyProfile,

    // Actions
    calculate,
  };
}
