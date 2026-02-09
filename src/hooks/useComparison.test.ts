import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useComparison } from './useComparison';
import type { EnergyProfile, TariffStructure, SubsidyConfig, FinancialParams, CalculationResult, SensitivityDataPoint } from '../types';

vi.mock('../services/api/api-client', () => ({
  calculateViaAPI: vi.fn(),
  sensitivityViaAPI: vi.fn(),
}));

import { calculateViaAPI, sensitivityViaAPI } from '../services/api/api-client';

const mockCalc = vi.mocked(calculateViaAPI);
const mockSens = vi.mocked(sensitivityViaAPI);

function makeResult(npv: number): CalculationResult {
  return {
    npv,
    irr: 0.1,
    simplePayback: 5,
    discountedPayback: 6,
    annualSavings: 10000,
    totalSavings: 100000,
    lcos: 0.15,
    monthlyBreakdown: [],
    scenarioResults: [],
    peakShavingSavings: 2000,
    peakReductionKw: 20,
    grossInvestment: 70000,
    netInvestment: 50000,
    annualSubsidy: 3000,
    cashflows: [],
    arbitrageSavings: 8000,
    yearlyBreakdown: [],
    simulation: {
      hourlyResults: [],
      totalCostWithBattery: 50000,
      totalCostWithoutBattery: 60000,
      totalSavings: 10000,
      totalCharged: 5000,
      totalDischarged: 4500,
      totalCycles: 300,
      peakReduction: 20,
    },
    blendedGridPrice: 0.18,
    co2ReductionKg: 5000,
    noSubsidyNpv: npv - 10000,
    noSubsidyPayback: 8,
    noSubsidyIrr: 0.05,
    subsidyImpactEur: 10000,
    operatingRegime: {
      hours: { arbitrage_charge: 2000, arbitrage_discharge: 2000, peak_shaving: 1000, idle: 3760 },
      revenue: { arbitrage_charge: 0, arbitrage_discharge: 5000, peak_shaving: 2000, idle: 0 },
    },
    subsidySchedule: [],
    yearlyRevenueBreakdown: [],
    co2Timeline: [],
    paybackConfidence: { optimistic: 4, base: 5, pessimistic: 7, rangeYears: 3, confidence: 'midden' },
  } as CalculationResult;
}

const mockSensitivity: SensitivityDataPoint[] = [
  { variable: 'capacityKwh', label: 'Capaciteit', lowValue: 50, baseValue: 100, highValue: 150, lowNpv: 5000, baseNpv: 15000, highNpv: 25000, unit: 'kWh' },
];

const mockProfile: EnergyProfile = {
  hourlyConsumptionKwh: new Array(8760).fill(20),
  peakDemandKw: 80,
  annualConsumptionKwh: 200000,
  connectionCapacityKw: 100,
  sector: 'hospitality',
  dataSource: 'synthetic',
};

const mockTariffs: TariffStructure = {
  commodityRatePerKwh: 0.12,
  peakRate: 0.22,
  offPeakRate: 0.14,
  networkTariffPerKw: 27.5,
  energyTaxPerKwh: 0.01312,
  odeSurchargePerKwh: 0.00642,
  feedInTariffPerKwh: 0.07,
  pricingMode: 'dynamic',
};

const mockSubsidies: SubsidyConfig = {
  sdeEligible: true,
  sdeBaseAmount: 0.068,
  eiaPercentage: 0.455,
  eiaMaxDeduction: 136000000,
};

const mockFinancials: FinancialParams = {
  discountRate: 0.06,
  inflationRate: 0.02,
  electricityPriceGrowthRate: 0.03,
  years: 15,
};

describe('useComparison', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCalc.mockResolvedValue(makeResult(15000));
    mockSens.mockResolvedValue(mockSensitivity);
  });

  it('starts with 1 default config', () => {
    const { result } = renderHook(() => useComparison());
    expect(result.current.configs).toHaveLength(1);
    expect(result.current.results).toHaveLength(0);
    expect(result.current.isCalculating).toBe(false);
  });

  it('can add configs up to max 3', () => {
    const { result } = renderHook(() => useComparison());

    act(() => result.current.addConfig());
    expect(result.current.configs).toHaveLength(2);

    act(() => result.current.addConfig());
    expect(result.current.configs).toHaveLength(3);

    // Cannot add beyond 3
    act(() => result.current.addConfig());
    expect(result.current.configs).toHaveLength(3);
  });

  it('can remove config but not below 1', () => {
    const { result } = renderHook(() => useComparison());

    act(() => result.current.addConfig());
    expect(result.current.configs).toHaveLength(2);

    const firstId = result.current.configs[0].id;
    act(() => result.current.removeConfig(firstId));
    expect(result.current.configs).toHaveLength(1);

    // Cannot remove last config
    const remainingId = result.current.configs[0].id;
    act(() => result.current.removeConfig(remainingId));
    expect(result.current.configs).toHaveLength(1);
  });

  it('can update a config', () => {
    const { result } = renderHook(() => useComparison());
    const id = result.current.configs[0].id;

    act(() => result.current.updateConfig(id, { label: 'Aangepast' }));
    expect(result.current.configs[0].label).toBe('Aangepast');

    act(() => result.current.updateConfig(id, { config: { capacityKwh: 200 } as any }));
    expect(result.current.configs[0].config.capacityKwh).toBe(200);
  });

  it('calculates all configs in parallel', async () => {
    const { result } = renderHook(() => useComparison());

    act(() => result.current.addConfig());

    await act(async () => {
      await result.current.calculateAll(mockProfile, mockTariffs, mockSubsidies, mockFinancials);
    });

    // 2 configs => 2 calculateViaAPI + 2 sensitivityViaAPI calls
    expect(mockCalc).toHaveBeenCalledTimes(2);
    expect(mockSens).toHaveBeenCalledTimes(2);
    expect(result.current.results).toHaveLength(2);
  });

  it('recommends config with highest positive NPV', async () => {
    mockCalc
      .mockResolvedValueOnce(makeResult(10000))
      .mockResolvedValueOnce(makeResult(25000));
    mockSens.mockResolvedValue(mockSensitivity);

    const { result } = renderHook(() => useComparison());
    act(() => result.current.addConfig());

    await act(async () => {
      await result.current.calculateAll(mockProfile, mockTariffs, mockSubsidies, mockFinancials);
    });

    expect(result.current.recommendation).not.toBeNull();
    expect(result.current.recommendation!.results.npv).toBe(25000);
  });

  it('no recommendation when all configs have negative NPV', async () => {
    mockCalc
      .mockResolvedValueOnce(makeResult(-5000))
      .mockResolvedValueOnce(makeResult(-10000));
    mockSens.mockResolvedValue(mockSensitivity);

    const { result } = renderHook(() => useComparison());
    act(() => result.current.addConfig());

    await act(async () => {
      await result.current.calculateAll(mockProfile, mockTariffs, mockSubsidies, mockFinancials);
    });

    expect(result.current.recommendation).toBeNull();
  });

  it('sets error when API call fails', async () => {
    mockCalc.mockRejectedValue(new Error('Server fout'));

    const { result } = renderHook(() => useComparison());

    await act(async () => {
      await result.current.calculateAll(mockProfile, mockTariffs, mockSubsidies, mockFinancials);
    });

    expect(result.current.error).toBe('Server fout');
    expect(result.current.isCalculating).toBe(false);
  });
});
