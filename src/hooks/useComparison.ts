import { useState, useCallback, useRef, useMemo } from 'react';
import type {
  BatteryConfig,
  EnergyProfile,
  TariffStructure,
  SubsidyConfig,
  FinancialParams,
  NamedBatteryConfig,
  ComparisonResult,
} from '../types';
import { calculateViaAPI, sensitivityViaAPI } from '../services/api/api-client';

const MAX_CONFIGS = 3;

function createDefaultConfig(id: number): NamedBatteryConfig {
  return {
    id: String(id),
    label: `Configuratie ${id}`,
    config: {
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
    },
  };
}

export function useComparison() {
  const nextIdRef = useRef(1);
  const [configs, setConfigs] = useState<NamedBatteryConfig[]>(() => {
    const config = createDefaultConfig(nextIdRef.current++);
    return [config];
  });
  const [results, setResults] = useState<ComparisonResult[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addConfig = useCallback((initial?: BatteryConfig) => {
    setConfigs((prev) => {
      if (prev.length >= MAX_CONFIGS) return prev;
      const newConfig = createDefaultConfig(nextIdRef.current++);
      if (initial) {
        newConfig.config = { ...initial };
      }
      return [...prev, newConfig];
    });
  }, []);

  const removeConfig = useCallback((id: string) => {
    setConfigs((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((c) => c.id !== id);
    });
    setResults((prev) => prev.filter((r) => r.configId !== id));
  }, []);

  const updateConfig = useCallback((id: string, partial: Partial<NamedBatteryConfig>) => {
    setConfigs((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        return {
          ...c,
          ...partial,
          config: partial.config ? { ...c.config, ...partial.config } : c.config,
        };
      })
    );
  }, []);

  const calculateAll = useCallback(async (
    energyProfile: EnergyProfile,
    tariffs: TariffStructure,
    subsidies: SubsidyConfig,
    financials: FinancialParams
  ) => {
    setIsCalculating(true);
    setError(null);

    try {
      const currentConfigs = configs;
      const promises = currentConfigs.map(async (namedConfig): Promise<ComparisonResult> => {
        const [calcResult, sensitivityData] = await Promise.all([
          calculateViaAPI(namedConfig.config, energyProfile, tariffs, subsidies, financials),
          sensitivityViaAPI(namedConfig.config, energyProfile, tariffs, subsidies, financials),
        ]);
        return {
          configId: namedConfig.id,
          label: namedConfig.label,
          config: namedConfig.config,
          results: calcResult,
          sensitivity: sensitivityData,
        };
      });

      const allResults = await Promise.all(promises);
      setResults(allResults);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Vergelijking berekenen mislukt';
      setError(message);
    } finally {
      setIsCalculating(false);
    }
  }, [configs]);

  const recommendation = useMemo(() => getRecommendation(results), [results]);

  return {
    configs,
    results,
    isCalculating,
    error,
    recommendation,
    addConfig,
    removeConfig,
    updateConfig,
    calculateAll,
    setConfigs,
  };
}

function getRecommendation(results: ComparisonResult[]): ComparisonResult | null {
  if (results.length === 0) return null;

  const positiveResults = results.filter((r) => r.results.npv > 0);
  if (positiveResults.length === 0) return null;

  return positiveResults.reduce((best, current) =>
    current.results.npv > best.results.npv ? current : best
  );
}
