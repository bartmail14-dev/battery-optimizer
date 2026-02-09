import { describe, it, expect } from 'vitest';
import { calculateFullResult, sensitivityAnalysis } from './scenario-engine';
import { generateHourlyProfile } from './profile-generator';
import type { BatteryConfig, EnergyProfile, TariffStructure, SubsidyConfig, FinancialParams } from '../../types';
import { EPEX_TYPICAL_PROFILE } from '../../constants';

/**
 * Integration tests: full pipeline from profile generation through financial analysis.
 * These test the complete chain that a real user would trigger.
 */

const battery: BatteryConfig = {
  capacityKwh: 100,
  powerKw: 50,
  roundTripEfficiency: 0.89,
  annualDegradation: 0.025,
  cycleLife: 12000,
  depthOfDischarge: 0.9,
  costPerKwh: 550,
  installationCost: 15000,
  annualMaintenanceCost: 2000,
  lifespanYears: 15,
};

const subsidies: SubsidyConfig = {
  sdeEligible: true,
  sdeBaseAmount: 0.068,
  eiaPercentage: 0.455,
  eiaMaxDeduction: 136000000,
};

const financials: FinancialParams = {
  discountRate: 0.06,
  inflationRate: 0.025,
  electricityPriceGrowthRate: 0.03,
  years: 15,
};

describe('Integration: fixed pricing pipeline', () => {
  const tariffs: TariffStructure = {
    commodityRatePerKwh: 0.12,
    peakRate: 0.22,
    offPeakRate: 0.14,
    networkTariffPerKw: 27.5,
    energyTaxPerKwh: 0.01312,
    odeSurchargePerKwh: 0.00642,
    feedInTariffPerKwh: 0.07,
    pricingMode: 'fixed',
  };

  it('hospitality 200 MWh: full pipeline produces complete, consistent result', () => {
    const hourly = generateHourlyProfile(200000, 80, 'hospitality');
    const profile: EnergyProfile = {
      hourlyConsumptionKwh: hourly,
      peakDemandKw: 80,
      annualConsumptionKwh: 200000,
      connectionCapacityKw: 100,
      sector: 'hospitality',
      dataSource: 'synthetic',
    };

    const result = calculateFullResult(battery, profile, tariffs, subsidies, financials);

    // Structure checks
    expect(result.monthlyBreakdown).toHaveLength(12);
    expect(result.scenarioResults).toHaveLength(3);
    expect(result.simulation.hourlyResults).toHaveLength(8760);

    // Financial consistency
    expect(result.grossInvestment).toBe(100 * 550 + 15000); // 70,000
    expect(result.netInvestment).toBeLessThan(result.grossInvestment); // EIA applied
    expect(result.annualSavings).toBeGreaterThan(0);
    expect(result.peakShavingSavings).toBeGreaterThanOrEqual(0);
    expect(result.lcos).toBeGreaterThan(0);
    expect(isFinite(result.npv)).toBe(true);
    // IRR may be Infinity if the business case doesn't break even
    expect(typeof result.irr).toBe('number');

    // Scenario ordering
    const opt = result.scenarioResults.find(s => s.scenario === 'optimistic')!;
    const base = result.scenarioResults.find(s => s.scenario === 'base')!;
    const pess = result.scenarioResults.find(s => s.scenario === 'pessimistic')!;
    expect(opt.npv).toBeGreaterThanOrEqual(base.npv);
    expect(base.npv).toBeGreaterThanOrEqual(pess.npv);
  });

  it('kantoor 500 MWh: larger facility produces valid result', () => {
    const hourly = generateHourlyProfile(500000, 200, 'kantoor');
    const profile: EnergyProfile = {
      hourlyConsumptionKwh: hourly,
      peakDemandKw: 200,
      annualConsumptionKwh: 500000,
      connectionCapacityKw: 250,
      sector: 'kantoor',
      dataSource: 'synthetic',
    };

    const result = calculateFullResult(battery, profile, tariffs, subsidies, financials);
    expect(result.monthlyBreakdown).toHaveLength(12);
    expect(isFinite(result.npv)).toBe(true);
    expect(result.annualSavings).toBeGreaterThan(0);
  });
});

describe('Integration: dynamic EPEX pricing pipeline', () => {
  const tariffs: TariffStructure = {
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

  it('dynamic pricing: full pipeline produces meaningful savings', () => {
    const hourly = generateHourlyProfile(200000, 80, 'hospitality');
    const profile: EnergyProfile = {
      hourlyConsumptionKwh: hourly,
      peakDemandKw: 80,
      annualConsumptionKwh: 200000,
      connectionCapacityKw: 100,
      sector: 'hospitality',
      dataSource: 'synthetic',
    };

    const result = calculateFullResult(battery, profile, tariffs, subsidies, financials);

    expect(result.simulation.hourlyResults).toHaveLength(8760);
    expect(result.simulation.totalSavings).toBeGreaterThan(0);
    expect(result.annualSavings).toBeGreaterThan(0);
    expect(isFinite(result.npv)).toBe(true);
    expect(result.monthlyBreakdown).toHaveLength(12);
  });

  it('dynamic pricing produces higher savings than narrow fixed spread', () => {
    const hourly = generateHourlyProfile(200000, 80, 'hospitality');
    const profile: EnergyProfile = {
      hourlyConsumptionKwh: hourly,
      peakDemandKw: 80,
      annualConsumptionKwh: 200000,
      connectionCapacityKw: 100,
      sector: 'hospitality',
      dataSource: 'synthetic',
    };

    const narrowFixed: TariffStructure = {
      ...tariffs,
      pricingMode: 'fixed',
      peakRate: 0.13,
      offPeakRate: 0.11,
      hourlyPrices: undefined,
    };

    const dynamicResult = calculateFullResult(battery, profile, tariffs, subsidies, financials);
    const fixedResult = calculateFullResult(battery, profile, narrowFixed, subsidies, financials);

    expect(dynamicResult.annualSavings).toBeGreaterThan(fixedResult.annualSavings);
  });

  it('sensitivity analysis returns consistent base NPV across all variables', () => {
    const hourly = generateHourlyProfile(200000, 80, 'hospitality');
    const profile: EnergyProfile = {
      hourlyConsumptionKwh: hourly,
      peakDemandKw: 80,
      annualConsumptionKwh: 200000,
      connectionCapacityKw: 100,
      sector: 'hospitality',
      dataSource: 'synthetic',
    };

    const result = calculateFullResult(battery, profile, tariffs, subsidies, financials);
    const sensitivity = sensitivityAnalysis(battery, profile, tariffs, subsidies, financials);

    expect(sensitivity).toHaveLength(5);
    for (const s of sensitivity) {
      expect(s.baseNpv).toBeCloseTo(result.npv, 0);
    }
  });
});
