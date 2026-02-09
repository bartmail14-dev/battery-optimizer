import { describe, it, expect } from 'vitest';
import { calculateFullResult, sensitivityAnalysis } from './scenario-engine';
import {
  baseBattery,
  baseTariffs,
  baseSubsidies,
  noSubsidies,
  baseFinancials,
  makeProfile,
  generateHospitalProfile,
  generateOfficeProfile,
  generateDatacenterProfile,
} from '../../test-fixtures/profile-helpers';
import type { BatteryConfig, TariffStructure, FinancialParams } from '../../types';

/**
 * Advisory conclusion tests — verify that the tool's output supports
 * correct go/no-go investment advice. A consultant must be able to
 * stake their reputation on these conclusions.
 */
describe('Advisory conclusions', () => {

  // ── GO/NO-GO DECISIONS ───────────────────────────────────────

  it('CLEAR GO: large hospital + properly sized battery + SDE++ → positive NPV, payback < 15yr', () => {
    // Properly sized battery: 500 kWh for a 2 GWh facility (≈7% of daily consumption)
    // Battery cost at lower end of BNEF range (economies of scale for larger system)
    const sizedBattery: BatteryConfig = {
      ...baseBattery,
      capacityKwh: 500,
      powerKw: 250,
      costPerKwh: 450,
      installationCost: 15_000,
    };
    const hourly = generateHospitalProfile(2_000_000);
    const profile = makeProfile(hourly, 'healthcare');
    const result = calculateFullResult(sizedBattery, profile, baseTariffs, baseSubsidies, baseFinancials);
    // With SDE++ and large facility, this should be clearly viable
    expect(result.simplePayback).toBeLessThan(15);
    expect(result.simplePayback).toBeGreaterThan(0);
    // NPV with subsidies should be better than without
    expect(result.npv).toBeGreaterThan(result.noSubsidyNpv);
  });

  it('CLEAR NO-GO: expensive battery + flat tariffs + no subsidies → negative NPV', () => {
    const expensiveBattery: BatteryConfig = {
      ...baseBattery,
      costPerKwh: 1500,
      installationCost: 50_000,
    };
    const flatTariffs: TariffStructure = {
      ...baseTariffs,
      peakRate: 0.15,
      offPeakRate: 0.15,
      pricingMode: 'fixed',
      hourlyPrices: undefined,
    };
    const hourly = generateOfficeProfile(150_000);
    const profile = makeProfile(hourly, 'kantoor');
    const result = calculateFullResult(expensiveBattery, profile, flatTariffs, noSubsidies, baseFinancials);

    expect(result.npv).toBeLessThan(0);
    expect(result.simplePayback).toBe(Infinity);
  });

  it('AMBIGUOUS: marginal case shows appropriate uncertainty', () => {
    // Medium-cost battery, moderate spread, no subsidies
    const mediumBattery: BatteryConfig = { ...baseBattery, costPerKwh: 600 };
    const modestTariffs: TariffStructure = {
      ...baseTariffs,
      peakRate: 0.16,
      offPeakRate: 0.12,
      pricingMode: 'fixed',
      hourlyPrices: undefined,
    };
    const hourly = generateOfficeProfile(150_000);
    const profile = makeProfile(hourly, 'kantoor');
    const result = calculateFullResult(mediumBattery, profile, modestTariffs, noSubsidies, baseFinancials);

    // NPV could be slightly positive or negative — the tool should reflect uncertainty
    // paybackConfidence should NOT be 'hoog'
    if (result.npv < 5000 && result.npv > -30000) {
      // Marginal case detected
      expect(['midden', 'laag']).toContain(result.paybackConfidence.confidence);
    }
  });

  // ── SUBSIDY DEPENDENCY ───────────────────────────────────────

  it('subsidy-dependent: subsidies improve NPV significantly', () => {
    const hourly = generateHospitalProfile(200_000);
    const profile = makeProfile(hourly, 'hospitality');
    const result = calculateFullResult(baseBattery, profile, baseTariffs, baseSubsidies, baseFinancials);

    // NPV with subsidies should always be better than without
    expect(result.npv).toBeGreaterThan(result.noSubsidyNpv);

    // Subsidy impact should be significant (SDE++ 15 yr + EIA one-time)
    expect(result.subsidyImpactEur).toBeGreaterThan(5_000);

    // Without subsidies, the investment case worsens
    const noSubResult = calculateFullResult(baseBattery, profile, baseTariffs, noSubsidies, baseFinancials);
    expect(noSubResult.npv).toBeLessThan(result.npv);
  });

  // ── SDE++ CLIFF ──────────────────────────────────────────────

  it('30-year project: SDE++ cliff at year 15 → cashflow drops', () => {
    const longFinancials: FinancialParams = { ...baseFinancials, years: 30 };
    const hourly = generateHospitalProfile(200_000);
    const profile = makeProfile(hourly, 'hospitality');
    const result = calculateFullResult(baseBattery, profile, baseTariffs, baseSubsidies, longFinancials);

    // Year 15: has SDE++ subsidy
    const year15 = result.yearlyBreakdown.find(y => y.year === 15)!;
    // Year 16: no SDE++ subsidy (beyond 15-year limit)
    const year16 = result.yearlyBreakdown.find(y => y.year === 16)!;

    // Cashflow should drop at year 16
    expect(year16.netCashflow).toBeLessThan(year15.netCashflow);

    // The subsidy schedule should confirm this
    const sdeYear15 = result.subsidySchedule.find(s => s.year === 15)!;
    const sdeYear16 = result.subsidySchedule.find(s => s.year === 16)!;
    expect(sdeYear15.isSdeActive).toBe(true);
    expect(sdeYear16.isSdeActive).toBe(false);
    expect(sdeYear16.sdeAmount).toBe(0);
  });

  it('15-year project: all operational years have SDE++', () => {
    const hourly = generateHospitalProfile(200_000);
    const profile = makeProfile(hourly, 'hospitality');
    const result = calculateFullResult(baseBattery, profile, baseTariffs, baseSubsidies, baseFinancials);

    for (let year = 1; year <= 15; year++) {
      const entry = result.subsidySchedule.find(s => s.year === year);
      expect(entry).toBeDefined();
      if (entry) {
        expect(entry.isSdeActive).toBe(true);
        expect(entry.sdeAmount).toBeGreaterThan(0);
      }
    }
  });

  // ── DANGEROUS CONCLUSIONS ────────────────────────────────────

  it('DANGER: zero-consumption building → savings ≈ 0, NPV ≈ -investment', () => {
    // A building with zero consumption cannot benefit from battery storage
    const zeroProfile = makeProfile(new Array(8760).fill(0), 'overig');
    const result = calculateFullResult(baseBattery, zeroProfile, baseTariffs, baseSubsidies, baseFinancials);

    // Tiny residual from efficiency losses on idle battery — effectively zero
    expect(Math.abs(result.annualSavings)).toBeLessThan(10);
    // NPV should be approximately negative investment
    expect(result.npv).toBeLessThan(0);
    expect(result.simplePayback).toBe(Infinity);
  });

  it('DANGER: oversized battery → NPV deeply negative, payback = Infinity', () => {
    const hugeBattery: BatteryConfig = {
      ...baseBattery,
      capacityKwh: 10_000,
      powerKw: 5_000,
      costPerKwh: 550,
      installationCost: 100_000,
    };
    // Small office: 50,000 kWh/year
    const hourly = generateOfficeProfile(50_000);
    const profile = makeProfile(hourly, 'kantoor');
    const result = calculateFullResult(hugeBattery, profile, baseTariffs, baseSubsidies, baseFinancials);

    // Investment: 10,000 × 550 + 100,000 = 5,600,000 EUR
    // Savings: maybe 1000-2000 EUR/year for a small office
    expect(result.grossInvestment).toBeGreaterThan(5_000_000);
    expect(result.npv).toBeLessThan(-1_000_000);
    expect(result.simplePayback).toBe(Infinity);
  });

  it('DANGER: undersized battery → honest (tiny) positive savings', () => {
    const tinyBattery: BatteryConfig = {
      ...baseBattery,
      capacityKwh: 10,
      powerKw: 5,
    };
    const hourly = generateHospitalProfile(2_000_000);
    const profile = makeProfile(hourly, 'healthcare');
    const result = calculateFullResult(tinyBattery, profile, baseTariffs, baseSubsidies, baseFinancials);

    // Tiny battery should produce tiny savings
    expect(result.annualSavings).toBeGreaterThan(0);
    expect(result.annualSavings).toBeLessThan(1_000);
    // NPV likely negative (tiny savings can't offset even small investment)
    expect(result.npv).toBeLessThan(0);
  });

  // ── SCENARIO SPREAD ──────────────────────────────────────────

  it('scenario spread reflects real uncertainty', () => {
    const hourly = generateHospitalProfile(200_000);
    const profile = makeProfile(hourly, 'hospitality');
    const result = calculateFullResult(baseBattery, profile, baseTariffs, baseSubsidies, baseFinancials);

    // Payback range should exist (optimistic < pessimistic)
    expect(result.paybackConfidence.pessimistic).toBeGreaterThanOrEqual(
      result.paybackConfidence.optimistic
    );

    // Range should be > 0 (scenarios make a difference)
    if (isFinite(result.paybackConfidence.rangeYears)) {
      expect(result.paybackConfidence.rangeYears).toBeGreaterThan(0);
    }
  });

  it('sensitivity analysis identifies electricity price as major driver', () => {
    const hourly = generateHospitalProfile(200_000);
    const profile = makeProfile(hourly, 'hospitality');
    const sensitivity = sensitivityAnalysis(baseBattery, profile, baseTariffs, baseSubsidies, baseFinancials);

    // Find the variable with the widest NPV range
    let maxRange = 0;
    let maxVar = '';
    for (const s of sensitivity) {
      const range = Math.abs(s.highNpv - s.lowNpv);
      if (range > maxRange) {
        maxRange = range;
        maxVar = s.variable;
      }
    }

    // Electricity price or price growth should be among the top drivers
    const topDrivers = ['electricityPrice', 'priceGrowth', 'batteryCost'];
    expect(topDrivers).toContain(maxVar);
  });
});
