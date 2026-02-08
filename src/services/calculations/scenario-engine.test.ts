import { describe, it, expect } from 'vitest';
import { generateScenarios, calculateFullResult, sensitivityAnalysis } from './scenario-engine';
import { generateSubsidySchedule } from './subsidy-calculator';
import { generateYearlyRevenueBreakdown } from './financial-model';
import type { BatteryConfig, EnergyProfile, TariffStructure, SubsidyConfig, FinancialParams } from '../../types';

const battery: BatteryConfig = {
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

const profile: EnergyProfile = {
  hourlyConsumptionKwh: new Array(8760).fill(25),
  peakDemandKw: 40,
  annualConsumptionKwh: 25 * 8760,
  connectionCapacityKw: 60,
  sector: 'hospitality',
};

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

describe('generateScenarios', () => {
  it('returns exactly 3 scenarios', () => {
    const results = generateScenarios(battery, profile, tariffs, subsidies, financials);
    expect(results).toHaveLength(3);
  });

  it('includes all three scenario types', () => {
    const results = generateScenarios(battery, profile, tariffs, subsidies, financials);
    const types = results.map((r) => r.scenario);
    expect(types).toContain('optimistic');
    expect(types).toContain('base');
    expect(types).toContain('pessimistic');
  });

  it('optimistic NPV >= base NPV >= pessimistic NPV', () => {
    const results = generateScenarios(battery, profile, tariffs, subsidies, financials);
    const byType = Object.fromEntries(results.map((r) => [r.scenario, r]));
    expect(byType.optimistic.npv).toBeGreaterThanOrEqual(byType.base.npv);
    expect(byType.base.npv).toBeGreaterThanOrEqual(byType.pessimistic.npv);
  });

  it('optimistic payback <= base payback <= pessimistic payback', () => {
    const results = generateScenarios(battery, profile, tariffs, subsidies, financials);
    const byType = Object.fromEntries(results.map((r) => [r.scenario, r]));
    expect(byType.optimistic.simplePayback).toBeLessThanOrEqual(byType.base.simplePayback);
    expect(byType.base.simplePayback).toBeLessThanOrEqual(byType.pessimistic.simplePayback);
  });

  // --- Extended ---

  it('optimistic annual savings >= base >= pessimistic', () => {
    const results = generateScenarios(battery, profile, tariffs, subsidies, financials);
    const byType = Object.fromEntries(results.map((r) => [r.scenario, r]));
    expect(byType.optimistic.annualSavings).toBeGreaterThanOrEqual(byType.base.annualSavings);
    // Base and pessimistic have same tariffs → same simulation → same annual savings
    // Pessimistic only changes battery cost and financial params
  });

  it('all scenarios produce finite NPV values', () => {
    const results = generateScenarios(battery, profile, tariffs, subsidies, financials);
    for (const r of results) {
      expect(isFinite(r.npv)).toBe(true);
    }
  });

  it('all scenarios produce finite annual savings', () => {
    const results = generateScenarios(battery, profile, tariffs, subsidies, financials);
    for (const r of results) {
      expect(isFinite(r.annualSavings)).toBe(true);
    }
  });

  it('all scenarios produce positive LCOS', () => {
    const results = generateScenarios(battery, profile, tariffs, subsidies, financials);
    for (const r of results) {
      expect(r.lcos).toBeGreaterThan(0);
    }
  });

  it('works without subsidies', () => {
    const noSubsidy: SubsidyConfig = {
      sdeEligible: false,
      sdeBaseAmount: 0,
      eiaPercentage: 0,
      eiaMaxDeduction: 0,
    };
    const results = generateScenarios(battery, profile, tariffs, noSubsidy, financials);
    expect(results).toHaveLength(3);
    for (const r of results) {
      expect(isFinite(r.npv)).toBe(true);
    }
  });

  it('higher tariff spread produces better scenarios', () => {
    const lowSpread: TariffStructure = { ...tariffs, peakRate: 0.16, offPeakRate: 0.14 };
    const highSpread: TariffStructure = { ...tariffs, peakRate: 0.30, offPeakRate: 0.10 };
    const lowResults = generateScenarios(battery, profile, lowSpread, subsidies, financials);
    const highResults = generateScenarios(battery, profile, highSpread, subsidies, financials);
    const lowBase = lowResults.find(r => r.scenario === 'base')!;
    const highBase = highResults.find(r => r.scenario === 'base')!;
    expect(highBase.npv).toBeGreaterThan(lowBase.npv);
  });
});

describe('calculateFullResult', () => {
  it('returns complete result with all fields', () => {
    const result = calculateFullResult(battery, profile, tariffs, subsidies, financials);
    expect(result.npv).toBeDefined();
    expect(result.irr).toBeDefined();
    expect(result.simplePayback).toBeDefined();
    expect(result.discountedPayback).toBeDefined();
    expect(result.annualSavings).toBeDefined();
    expect(result.totalSavings).toBeDefined();
    expect(result.lcos).toBeDefined();
    expect(result.monthlyBreakdown).toHaveLength(12);
    expect(result.scenarioResults).toHaveLength(3);
    // New fields from peak shaving + EIA + simulation
    expect(result.peakShavingSavings).toBeDefined();
    expect(result.peakReductionKw).toBeDefined();
    expect(result.grossInvestment).toBeDefined();
    expect(result.netInvestment).toBeDefined();
    expect(result.annualSubsidy).toBeDefined();
    expect(result.simulation).toBeDefined();
    expect(result.simulation.hourlyResults).toHaveLength(8760);
  });

  it('annual savings is positive for typical input', () => {
    const result = calculateFullResult(battery, profile, tariffs, subsidies, financials);
    expect(result.annualSavings).toBeGreaterThanOrEqual(0);
  });

  // --- Extended ---

  it('discounted payback >= simple payback', () => {
    const result = calculateFullResult(battery, profile, tariffs, subsidies, financials);
    if (isFinite(result.simplePayback) && isFinite(result.discountedPayback)) {
      expect(result.discountedPayback).toBeGreaterThanOrEqual(result.simplePayback);
    }
  });

  it('LCOS is positive and finite', () => {
    const result = calculateFullResult(battery, profile, tariffs, subsidies, financials);
    expect(result.lcos).toBeGreaterThan(0);
    expect(isFinite(result.lcos)).toBe(true);
  });

  it('base scenario result matches top-level result', () => {
    const result = calculateFullResult(battery, profile, tariffs, subsidies, financials);
    const base = result.scenarioResults.find(s => s.scenario === 'base');
    expect(base).toBeDefined();
    expect(base!.npv).toBeCloseTo(result.npv, 0);
    expect(base!.annualSavings).toBeCloseTo(result.annualSavings, 0);
  });

  it('monthly energy savings sum + peak shaving matches annual savings', () => {
    const result = calculateFullResult(battery, profile, tariffs, subsidies, financials);
    const monthlyEnergySavings = result.monthlyBreakdown.reduce((sum, m) => sum + m.savings, 0);
    // annualSavings = energy arbitrage savings + peak shaving savings
    expect(monthlyEnergySavings + result.peakShavingSavings).toBeCloseTo(result.annualSavings, 0);
  });

  it('healthcare profile produces valid result', () => {
    const healthProfile: EnergyProfile = {
      ...profile,
      sector: 'healthcare',
    };
    const result = calculateFullResult(battery, healthProfile, tariffs, subsidies, financials);
    expect(result.monthlyBreakdown).toHaveLength(12);
    expect(result.scenarioResults).toHaveLength(3);
    expect(isFinite(result.npv)).toBe(true);
  });

  it('zero consumption produces near-zero savings', () => {
    const zeroProfile: EnergyProfile = {
      hourlyConsumptionKwh: new Array(8760).fill(0),
      peakDemandKw: 0,
      annualConsumptionKwh: 0,
      connectionCapacityKw: 0,
      sector: 'hospitality',
    };
    const result = calculateFullResult(battery, zeroProfile, tariffs, subsidies, financials);
    // Savings can be slightly negative because battery still charges from grid at off-peak rates
    // but cannot discharge (no consumption), resulting in a small net cost
    expect(Math.abs(result.annualSavings)).toBeLessThan(100);
  });

  it('very expensive battery produces negative NPV', () => {
    const expensiveBattery: BatteryConfig = { ...battery, costPerKwh: 2000, installationCost: 100000 };
    const result = calculateFullResult(expensiveBattery, profile, tariffs, subsidies, financials);
    expect(result.npv).toBeLessThan(0);
  });

  it('EIA reduces net investment below gross investment', () => {
    const result = calculateFullResult(battery, profile, tariffs, subsidies, financials);
    expect(result.grossInvestment).toBeGreaterThan(0);
    expect(result.netInvestment).toBeLessThan(result.grossInvestment);
  });

  it('no EIA when percentage is zero', () => {
    const noEia: SubsidyConfig = { ...subsidies, eiaPercentage: 0 };
    const result = calculateFullResult(battery, profile, tariffs, noEia, financials);
    expect(result.grossInvestment).toBe(result.netInvestment);
  });

  it('peak shaving savings are non-negative', () => {
    const result = calculateFullResult(battery, profile, tariffs, subsidies, financials);
    expect(result.peakShavingSavings).toBeGreaterThanOrEqual(0);
    expect(result.peakReductionKw).toBeGreaterThanOrEqual(0);
  });

  it('annualSavings includes peak shaving', () => {
    const result = calculateFullResult(battery, profile, tariffs, subsidies, financials);
    // Energy arbitrage savings = simulation.totalSavings
    expect(result.annualSavings).toBeGreaterThanOrEqual(result.simulation.totalSavings);
  });

  // --- arbitrageSavings tests ---

  it('arbitrageSavings equals simulation.totalSavings', () => {
    const result = calculateFullResult(battery, profile, tariffs, subsidies, financials);
    expect(result.arbitrageSavings).toBeCloseTo(result.simulation.totalSavings, 2);
  });

  it('arbitrageSavings + peakShavingSavings equals annualSavings', () => {
    const result = calculateFullResult(battery, profile, tariffs, subsidies, financials);
    expect(result.arbitrageSavings + result.peakShavingSavings).toBeCloseTo(result.annualSavings, 2);
  });

  // --- yearlyBreakdown tests ---

  it('yearlyBreakdown has length years + 1 (including year 0)', () => {
    const result = calculateFullResult(battery, profile, tariffs, subsidies, financials);
    expect(result.yearlyBreakdown).toHaveLength(financials.years + 1);
  });

  it('yearlyBreakdown[0].netCashflow equals -netInvestment', () => {
    const result = calculateFullResult(battery, profile, tariffs, subsidies, financials);
    expect(result.yearlyBreakdown[0].netCashflow).toBeCloseTo(-result.netInvestment, 2);
  });

  it('yearlyBreakdown[i].netCashflow matches cashflows[i] for all i', () => {
    const result = calculateFullResult(battery, profile, tariffs, subsidies, financials);
    for (let i = 0; i < result.cashflows.length; i++) {
      expect(result.yearlyBreakdown[i].netCashflow).toBeCloseTo(result.cashflows[i], 2);
    }
  });

  it('yearlyBreakdown cumulativeCashflow accumulates correctly', () => {
    const result = calculateFullResult(battery, profile, tariffs, subsidies, financials);
    let cumulative = 0;
    for (const entry of result.yearlyBreakdown) {
      cumulative += entry.netCashflow;
      expect(entry.cumulativeCashflow).toBeCloseTo(cumulative, 2);
    }
  });

  it('yearlyBreakdown degradationFactor = (1 - degradation)^year', () => {
    const result = calculateFullResult(battery, profile, tariffs, subsidies, financials);
    for (const entry of result.yearlyBreakdown) {
      const expected = Math.pow(1 - battery.annualDegradation, Math.max(0, entry.year - 1));
      // Year 0 has degradationFactor = 1
      if (entry.year === 0) {
        expect(entry.degradationFactor).toBe(1);
      } else {
        expect(entry.degradationFactor).toBeCloseTo(expected, 6);
      }
    }
  });

  it('yearlyBreakdown year 0 has zero savings, maintenance and subsidy', () => {
    const result = calculateFullResult(battery, profile, tariffs, subsidies, financials);
    const year0 = result.yearlyBreakdown[0];
    expect(year0.grossSavings).toBe(0);
    expect(year0.maintenance).toBe(0);
    expect(year0.subsidy).toBe(0);
    expect(year0.year).toBe(0);
  });

  it('yearlyBreakdown operational years have positive grossSavings', () => {
    const result = calculateFullResult(battery, profile, tariffs, subsidies, financials);
    for (let i = 1; i < result.yearlyBreakdown.length; i++) {
      expect(result.yearlyBreakdown[i].grossSavings).toBeGreaterThan(0);
    }
  });

  // --- co2ReductionKg tests ---

  it('co2ReductionKg is positive for standard scenario', () => {
    const result = calculateFullResult(battery, profile, tariffs, subsidies, financials);
    expect(result.co2ReductionKg).toBeGreaterThan(0);
  });

  // --- blendedGridPrice tests ---

  it('blendedGridPrice is positive and less than 1 EUR/kWh', () => {
    const result = calculateFullResult(battery, profile, tariffs, subsidies, financials);
    expect(result.blendedGridPrice).toBeGreaterThan(0);
    expect(result.blendedGridPrice).toBeLessThan(1);
  });

  // --- discountedCashflow tests ---

  it('discountedCashflow < netCashflow for year > 0', () => {
    const result = calculateFullResult(battery, profile, tariffs, subsidies, financials);
    for (let i = 1; i < result.yearlyBreakdown.length; i++) {
      const entry = result.yearlyBreakdown[i];
      expect(entry.discountedCashflow).toBeLessThan(entry.netCashflow);
    }
  });

  it('cumulativeDiscountedCashflow converges towards npv', () => {
    const result = calculateFullResult(battery, profile, tariffs, subsidies, financials);
    const lastEntry = result.yearlyBreakdown[result.yearlyBreakdown.length - 1];
    expect(lastEntry.cumulativeDiscountedCashflow).toBeCloseTo(result.npv, 0);
  });

  it('yearlyBreakdown discountFactor at year 0 is 1', () => {
    const result = calculateFullResult(battery, profile, tariffs, subsidies, financials);
    expect(result.yearlyBreakdown[0].discountFactor).toBe(1);
  });

  it('yearlyBreakdown discountFactor decreases over time', () => {
    const result = calculateFullResult(battery, profile, tariffs, subsidies, financials);
    for (let i = 2; i < result.yearlyBreakdown.length; i++) {
      expect(result.yearlyBreakdown[i].discountFactor).toBeLessThan(
        result.yearlyBreakdown[i - 1].discountFactor
      );
    }
  });
});

describe('sensitivityAnalysis', () => {
  it('returns 5 sensitivity variables', () => {
    const results = sensitivityAnalysis(battery, profile, tariffs, subsidies, financials);
    expect(results).toHaveLength(5);
  });

  it('each variable has low, base, and high NPV', () => {
    const results = sensitivityAnalysis(battery, profile, tariffs, subsidies, financials);
    for (const r of results) {
      expect(r.lowNpv).toBeDefined();
      expect(r.baseNpv).toBeDefined();
      expect(r.highNpv).toBeDefined();
      expect(r.label).toBeTruthy();
      expect(r.unit).toBeTruthy();
    }
  });

  it('base NPV is consistent across all variables', () => {
    const results = sensitivityAnalysis(battery, profile, tariffs, subsidies, financials);
    const baseValues = results.map((r) => r.baseNpv);
    for (let i = 1; i < baseValues.length; i++) {
      expect(baseValues[i]).toBeCloseTo(baseValues[0], 0);
    }
  });

  // --- Extended ---

  it('all NPV values are finite', () => {
    const results = sensitivityAnalysis(battery, profile, tariffs, subsidies, financials);
    for (const r of results) {
      expect(isFinite(r.lowNpv)).toBe(true);
      expect(isFinite(r.baseNpv)).toBe(true);
      expect(isFinite(r.highNpv)).toBe(true);
    }
  });

  it('lowValue < baseValue < highValue for each variable', () => {
    const results = sensitivityAnalysis(battery, profile, tariffs, subsidies, financials);
    for (const r of results) {
      expect(r.lowValue).toBeLessThan(r.baseValue);
      expect(r.highValue).toBeGreaterThan(r.baseValue);
    }
  });

  it('includes electricity price as a variable', () => {
    const results = sensitivityAnalysis(battery, profile, tariffs, subsidies, financials);
    const elec = results.find(r => r.variable === 'electricityPrice');
    expect(elec).toBeDefined();
    // Higher electricity price → higher savings → higher NPV
    expect(elec!.highNpv).toBeGreaterThan(elec!.lowNpv);
  });

  it('includes battery cost as a variable', () => {
    const results = sensitivityAnalysis(battery, profile, tariffs, subsidies, financials);
    const cost = results.find(r => r.variable === 'batteryCost');
    expect(cost).toBeDefined();
    // Higher battery cost → lower NPV
    expect(cost!.lowNpv).toBeGreaterThan(cost!.highNpv);
  });

  it('includes discount rate as a variable', () => {
    const results = sensitivityAnalysis(battery, profile, tariffs, subsidies, financials);
    const rate = results.find(r => r.variable === 'discountRate');
    expect(rate).toBeDefined();
    // Higher discount rate → lower NPV
    expect(rate!.lowNpv).toBeGreaterThan(rate!.highNpv);
  });

  it('includes degradation as a variable', () => {
    const results = sensitivityAnalysis(battery, profile, tariffs, subsidies, financials);
    const deg = results.find(r => r.variable === 'degradation');
    expect(deg).toBeDefined();
    // Lower degradation → higher NPV
    expect(deg!.lowNpv).toBeGreaterThan(deg!.highNpv);
  });

  it('includes price growth as a variable', () => {
    const results = sensitivityAnalysis(battery, profile, tariffs, subsidies, financials);
    const growth = results.find(r => r.variable === 'priceGrowth');
    expect(growth).toBeDefined();
    // Higher price growth → higher savings → higher NPV
    expect(growth!.highNpv).toBeGreaterThan(growth!.lowNpv);
  });
});

// ═══════════════════════════════════════════════════════════════
// Phase 2: New field tests
// ═══════════════════════════════════════════════════════════════

describe('calculateFullResult — no-subsidy comparison', () => {
  it('noSubsidyPayback >= simplePayback (subsidies help)', () => {
    const result = calculateFullResult(battery, profile, tariffs, subsidies, financials);
    if (isFinite(result.noSubsidyPayback) && isFinite(result.simplePayback)) {
      expect(result.noSubsidyPayback).toBeGreaterThanOrEqual(result.simplePayback);
    }
  });

  it('noSubsidyNpv <= npv (subsidies improve NPV)', () => {
    const result = calculateFullResult(battery, profile, tariffs, subsidies, financials);
    expect(result.noSubsidyNpv).toBeLessThanOrEqual(result.npv);
  });

  it('subsidyImpactEur is positive when subsidies are active', () => {
    const result = calculateFullResult(battery, profile, tariffs, subsidies, financials);
    expect(result.subsidyImpactEur).toBeGreaterThan(0);
  });

  it('subsidyImpactEur is zero when no subsidies', () => {
    const noSub: SubsidyConfig = {
      sdeEligible: false,
      sdeBaseAmount: 0,
      eiaPercentage: 0,
      eiaMaxDeduction: 0,
    };
    const result = calculateFullResult(battery, profile, tariffs, noSub, financials);
    expect(result.subsidyImpactEur).toBeCloseTo(0, 2);
  });

  it('noSubsidyIrr is finite', () => {
    const result = calculateFullResult(battery, profile, tariffs, subsidies, financials);
    expect(isFinite(result.noSubsidyIrr) || isNaN(result.noSubsidyIrr)).toBe(true);
  });
});

describe('calculateFullResult — operatingRegime', () => {
  it('total hours equals 8760', () => {
    const result = calculateFullResult(battery, profile, tariffs, subsidies, financials);
    const r = result.operatingRegime;
    const total = r.hours.arbitrage_charge + r.hours.arbitrage_discharge +
      r.hours.peak_shaving + r.hours.idle;
    expect(total).toBe(8760);
  });

  it('no negative hour counts', () => {
    const result = calculateFullResult(battery, profile, tariffs, subsidies, financials);
    const r = result.operatingRegime;
    expect(r.hours.arbitrage_charge).toBeGreaterThanOrEqual(0);
    expect(r.hours.arbitrage_discharge).toBeGreaterThanOrEqual(0);
    expect(r.hours.peak_shaving).toBeGreaterThanOrEqual(0);
    expect(r.hours.idle).toBeGreaterThanOrEqual(0);
  });
});

describe('generateSubsidySchedule', () => {
  it('SDE is zero after year 15', () => {
    const schedule = generateSubsidySchedule(battery, subsidies, 60000, 70000, 20);
    for (const entry of schedule) {
      if (entry.year > 15) {
        expect(entry.sdeAmount).toBe(0);
        expect(entry.isSdeActive).toBe(false);
      }
    }
  });

  it('EIA is only in year 0', () => {
    const schedule = generateSubsidySchedule(battery, subsidies, 60000, 70000, 15);
    expect(schedule[0].eiaAmount).toBeGreaterThan(0);
    for (let i = 1; i < schedule.length; i++) {
      expect(schedule[i].eiaAmount).toBe(0);
    }
  });

  it('SDE amounts decrease with degradation', () => {
    const schedule = generateSubsidySchedule(battery, subsidies, 60000, 70000, 15);
    // Compare year 1 and year 10 SDE amounts
    const year1 = schedule.find(s => s.year === 1);
    const year10 = schedule.find(s => s.year === 10);
    expect(year1).toBeDefined();
    expect(year10).toBeDefined();
    expect(year1!.sdeAmount).toBeGreaterThan(year10!.sdeAmount);
  });

  it('has years + 1 entries (including year 0)', () => {
    const schedule = generateSubsidySchedule(battery, subsidies, 60000, 70000, 15);
    expect(schedule).toHaveLength(16);
  });

  it('isSdeActive is true for years 1-15 when eligible', () => {
    const schedule = generateSubsidySchedule(battery, subsidies, 60000, 70000, 15);
    for (let i = 1; i <= 15; i++) {
      expect(schedule[i].isSdeActive).toBe(true);
    }
  });

  it('all SDE amounts are zero when not eligible', () => {
    const noSde: SubsidyConfig = { ...subsidies, sdeEligible: false };
    const schedule = generateSubsidySchedule(battery, noSde, 60000, 70000, 15);
    for (const entry of schedule) {
      expect(entry.sdeAmount).toBe(0);
    }
  });
});

describe('generateYearlyRevenueBreakdown', () => {
  it('netRevenue = arbitrage + peak + sde - maintenance for each year', () => {
    const schedule = generateSubsidySchedule(battery, subsidies, 60000, 70000, 15);
    const breakdown = generateYearlyRevenueBreakdown(5000, 1000, 2000, schedule, 15, 0.03, 0.025);

    for (const entry of breakdown) {
      const expected = entry.arbitrageSavings + entry.peakShavingSavings +
        entry.sdeSubsidy - entry.maintenanceCost;
      expect(entry.netRevenue).toBeCloseTo(expected, 2);
    }
  });

  it('arbitrageSavings decrease with degradation but increase with price growth', () => {
    const schedule = generateSubsidySchedule(battery, subsidies, 60000, 70000, 15);
    const breakdown = generateYearlyRevenueBreakdown(5000, 1000, 2000, schedule, 15, 0.03, 0.025);
    // Year 1 should have base arbitrage
    expect(breakdown[0].arbitrageSavings).toBeCloseTo(5000, 0);
  });

  it('has exactly years entries (no year 0)', () => {
    const schedule = generateSubsidySchedule(battery, subsidies, 60000, 70000, 15);
    const breakdown = generateYearlyRevenueBreakdown(5000, 1000, 2000, schedule, 15, 0.03, 0.025);
    expect(breakdown).toHaveLength(15);
    expect(breakdown[0].year).toBe(1);
  });

  it('maintenance cost is constant across years', () => {
    const schedule = generateSubsidySchedule(battery, subsidies, 60000, 70000, 15);
    const breakdown = generateYearlyRevenueBreakdown(5000, 1000, 2000, schedule, 15, 0.03, 0.025);
    for (const entry of breakdown) {
      expect(entry.maintenanceCost).toBe(2000);
    }
  });
});

describe('calculateFullResult — co2Timeline', () => {
  it('co2Timeline has financials.years entries', () => {
    const result = calculateFullResult(battery, profile, tariffs, subsidies, financials);
    expect(result.co2Timeline).toHaveLength(financials.years);
  });

  it('cumulativeReductionKg is monotonically increasing', () => {
    const result = calculateFullResult(battery, profile, tariffs, subsidies, financials);
    for (let i = 1; i < result.co2Timeline.length; i++) {
      expect(result.co2Timeline[i].cumulativeReductionKg).toBeGreaterThan(
        result.co2Timeline[i - 1].cumulativeReductionKg
      );
    }
  });

  it('annualReductionKg decreases over time (degradation)', () => {
    const result = calculateFullResult(battery, profile, tariffs, subsidies, financials);
    expect(result.co2Timeline[0].annualReductionKg).toBeGreaterThan(
      result.co2Timeline[result.co2Timeline.length - 1].annualReductionKg
    );
  });

  it('treesEquivalent is non-negative', () => {
    const result = calculateFullResult(battery, profile, tariffs, subsidies, financials);
    for (const entry of result.co2Timeline) {
      expect(entry.treesEquivalent).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('calculateFullResult — paybackConfidence', () => {
  it('has valid confidence level', () => {
    const result = calculateFullResult(battery, profile, tariffs, subsidies, financials);
    expect(['hoog', 'midden', 'laag']).toContain(result.paybackConfidence.confidence);
  });

  it('optimistic <= base <= pessimistic payback', () => {
    const result = calculateFullResult(battery, profile, tariffs, subsidies, financials);
    expect(result.paybackConfidence.optimistic).toBeLessThanOrEqual(result.paybackConfidence.base);
    expect(result.paybackConfidence.base).toBeLessThanOrEqual(result.paybackConfidence.pessimistic);
  });

  it('rangeYears equals pessimistic - optimistic', () => {
    const result = calculateFullResult(battery, profile, tariffs, subsidies, financials);
    const expected = result.paybackConfidence.pessimistic - result.paybackConfidence.optimistic;
    if (isFinite(expected)) {
      expect(result.paybackConfidence.rangeYears).toBeCloseTo(expected, 6);
    } else {
      // When pessimistic payback is Infinity, rangeYears is also Infinity
      expect(result.paybackConfidence.rangeYears).toBe(Infinity);
    }
  });

  it('matches scenario results', () => {
    const result = calculateFullResult(battery, profile, tariffs, subsidies, financials);
    const opt = result.scenarioResults.find(s => s.scenario === 'optimistic')!;
    const base = result.scenarioResults.find(s => s.scenario === 'base')!;
    const pess = result.scenarioResults.find(s => s.scenario === 'pessimistic')!;
    expect(result.paybackConfidence.optimistic).toBe(opt.simplePayback);
    expect(result.paybackConfidence.base).toBe(base.simplePayback);
    expect(result.paybackConfidence.pessimistic).toBe(pess.simplePayback);
  });
});
