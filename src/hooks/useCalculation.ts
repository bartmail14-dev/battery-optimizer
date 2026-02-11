import { useState, useCallback, useMemo, useRef } from 'react';
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
import { sensitivityViaAPI } from '../services/api/api-client';
import { adviseViaSSE } from '../services/api/advise-client';
import { generateHourlyProfile } from '../services/calculations/profile-generator';
import type { FullProject } from '../services/api/projects-client';
import {
  DEFAULT_BATTERY,
  DEFAULT_TARIFFS,
  DEFAULT_SUBSIDIES,
  DEFAULT_FINANCIALS,
} from '../constants';

export { generateHourlyProfile } from '../services/calculations/profile-generator';

export function useCalculation() {
  const [batteryConfig, setBatteryConfig] = useState<BatteryConfig>({
    ...DEFAULT_BATTERY,
    capacityKwh: 0,
    powerKw: 0,
  });
  const [tariffs, setTariffs] = useState<TariffStructure>(DEFAULT_TARIFFS);
  const [subsidies, setSubsidies] = useState<SubsidyConfig>(DEFAULT_SUBSIDIES);
  const [financials, setFinancials] = useState<FinancialParams>(DEFAULT_FINANCIALS);
  const [sector, setSector] = useState<Sector>('industrie');
  const [annualConsumption, setAnnualConsumption] = useState<number>(0);
  const [peakDemand, setPeakDemand] = useState<number>(0);
  const [connectionCapacity, setConnectionCapacity] = useState<number>(0);
  const [selectedScenario, setSelectedScenario] = useState<Scenario>('base');
  const [results, setResults] = useState<CalculationResult | null>(null);
  const [sensitivity, setSensitivity] = useState<SensitivityDataPoint[] | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customHourlyProfile, setCustomHourlyProfile] = useState<number[] | null>(null);

  // AI narrative state
  const [narrative, setNarrative] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [narrativeError, setNarrativeError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

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
    // Abort any running stream
    abortRef.current?.abort();

    setIsCalculating(true);
    setError(null);
    setNarrative('');
    setNarrativeError(null);
    setIsStreaming(true);

    const bat = overrides?.batteryConfig ?? batteryConfig;
    const prof = overrides?.energyProfile ?? energyProfile;
    const tar = overrides?.tariffs ?? tariffs;
    const sub = overrides?.subsidies ?? subsidies;
    const fin = overrides?.financials ?? financials;

    // Start SSE stream (calculation + AI narrative)
    const controller = adviseViaSSE(bat, prof, tar, sub, fin, {
      onResults: (calcResults) => {
        setResults(calcResults);
        setIsCalculating(false);
      },
      onNarrativeChunk: (chunk) => {
        setNarrative(prev => prev + chunk);
      },
      onDone: () => {
        setIsStreaming(false);
      },
      onError: (errMsg) => {
        if (!results) {
          // If we haven't received results yet, this is a calculation error
          setError(errMsg);
          setIsCalculating(false);
        }
        setNarrativeError(errMsg);
        setIsStreaming(false);
      },
    });

    abortRef.current = controller;

    // Run sensitivity in parallel (separate endpoint)
    try {
      const sensitivityData = await sensitivityViaAPI(bat, prof, tar, sub, fin);
      setSensitivity(sensitivityData);
    } catch (err) {
      console.error('Sensitivity analysis failed:', err);
    }
  }, [batteryConfig, energyProfile, tariffs, subsidies, financials, results]);

  const loadFromProject = useCallback((project: FullProject) => {
    abortRef.current?.abort();
    setBatteryConfig(project.batteryConfig);
    setTariffs(project.tariffs);
    setSubsidies(project.subsidies);
    setFinancials(project.financials);
    setSector(project.sector);
    setAnnualConsumption(project.annualConsumptionKwh);
    setPeakDemand(project.peakDemandKw);
    setConnectionCapacity(project.connectionCapacityKw);
    setCustomHourlyProfile(project.hourlyConsumptionKwh);
    setResults(null);
    setSensitivity(null);
    setNarrative('');
    setNarrativeError(null);
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
    narrative,
    isStreaming,
    narrativeError,

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
