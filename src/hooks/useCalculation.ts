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
  SensitivityDataPoint,
} from '../types';
import { calculateViaAPI, sensitivityViaAPI } from '../services/api/api-client';
import { generateHourlyProfile } from '../services/calculations/profile-generator';
import type { FullProject } from '../services/api/projects-client';
import {
  DEFAULT_BATTERY,
  DEFAULT_TARIFFS,
  DEFAULT_SUBSIDIES,
  DEFAULT_FINANCIALS,
  DEFAULT_PROFILE,
} from '../constants';

export { generateHourlyProfile } from '../services/calculations/profile-generator';

export function useCalculation() {
  const [batteryConfig, setBatteryConfig] = useState<BatteryConfig>(DEFAULT_BATTERY);
  const [tariffs, setTariffs] = useState<TariffStructure>(DEFAULT_TARIFFS);
  const [subsidies, setSubsidies] = useState<SubsidyConfig>(DEFAULT_SUBSIDIES);
  const [financials, setFinancials] = useState<FinancialParams>(DEFAULT_FINANCIALS);
  const [sector, setSector] = useState<Sector>('hospitality');
  const [annualConsumption, setAnnualConsumption] = useState(DEFAULT_PROFILE.annualConsumptionKwh);
  const [peakDemand, setPeakDemand] = useState(DEFAULT_PROFILE.peakDemandKw);
  const [connectionCapacity, setConnectionCapacity] = useState(DEFAULT_PROFILE.connectionCapacityKw);
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

  const loadFromProject = useCallback((project: FullProject) => {
    setBatteryConfig(project.batteryConfig);
    setTariffs(project.tariffs);
    setSubsidies(project.subsidies);
    setFinancials(project.financials);
    setSector(project.sector);
    setAnnualConsumption(project.annualConsumptionKwh);
    setPeakDemand(project.peakDemandKw);
    setConnectionCapacity(project.connectionCapacityKw);
    setCustomHourlyProfile(project.hourlyConsumptionKwh);
    // Clear previous results so user recalculates with loaded data
    setResults(null);
    setSensitivity(null);
    setError(null);
  }, []);

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
    loadFromProject,
  };
}
