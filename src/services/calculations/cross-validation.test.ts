import { describe, it, expect } from 'vitest';
import {
  calculateNPV,
  calculateIRR,
  calculateSimplePayback,
  calculateDiscountedPayback,
  calculateLCOS,
  generateCashflows,
  generateYearlyBreakdown,
} from './financial-model';
import { calculateSDE, calculateEIA, getEffectiveInvestment, generateSubsidySchedule } from './subsidy-calculator';
import { simulateBatteryOperation } from './battery-simulation';
import { calculateFullResult } from './scenario-engine';
import {
  baseBattery,
  baseTariffs,
  baseSubsidies,
  baseFinancials,
  makeProfile,
  generateHospitalProfile,
} from '../../test-fixtures/profile-helpers';
import type { BatteryConfig, SubsidyConfig } from '../../types';

/**
 * Cross-validation tests: every expected value is hand-calculated.
 * These are the CRITICAL tests — they prove the math independently.
 */
describe('Cross-validation: hand-calculated scenarios', () => {

  // ── 1. NPV hand calculation ────────────────────────────────

  it('NPV: -70000 + 15×6000 @ 6% = -11726.80', () => {
    // PV annuity factor = (1 - 1.06^-15) / 0.06 = 9.71225
    // NPV = -70000 + 6000 × 9.71225 = -70000 + 58273.50 = -11726.50
    const cashflows = [-70_000, ...new Array(15).fill(6_000)];
    const npv = calculateNPV(cashflows, 0.06);
    expect(npv).toBeCloseTo(-11727, 0);
  });

  it('NPV: -100000 + 20×10000 @ 5% = 24622', () => {
    // PV annuity factor = (1 - 1.05^-20) / 0.05 = 12.4622
    // NPV = -100000 + 10000 × 12.4622 = 24622
    const cashflows = [-100_000, ...new Array(20).fill(10_000)];
    const npv = calculateNPV(cashflows, 0.05);
    expect(npv).toBeCloseTo(24622, 0);
  });

  it('NPV at 0% discount = simple sum of cashflows', () => {
    const cashflows = [-50_000, 10_000, 10_000, 10_000, 10_000, 10_000, 10_000];
    const npv = calculateNPV(cashflows, 0);
    const sum = cashflows.reduce((s, v) => s + v, 0);
    expect(npv).toBeCloseTo(sum, 2);
  });

  // ── 2. IRR hand calculation ────────────────────────────────

  it('IRR: -100000 + 15×12000 ≈ 8.4%', () => {
    // PV_annuity(r, 15) = 100000/12000 = 8.3333
    // At 8%: PV_annuity = 8.5595 → NPV = +2714 (positive)
    // At 9%: PV_annuity = 8.0607 → NPV = -3272 (negative)
    // IRR by interpolation ≈ 8.4%
    const cashflows = [-100_000, ...new Array(15).fill(12_000)];
    const irr = calculateIRR(cashflows);
    expect(irr).toBeGreaterThan(0.08);
    expect(irr).toBeLessThan(0.09);
    // Verify: NPV(IRR) ≈ 0
    const npvAtIrr = calculateNPV(cashflows, irr);
    expect(Math.abs(npvAtIrr)).toBeLessThan(1);
  });

  it('IRR: -50000 + 5×15000 → fast payback, high IRR', () => {
    const cashflows = [-50_000, 15_000, 15_000, 15_000, 15_000, 15_000];
    const irr = calculateIRR(cashflows);
    // With 5 years of 15k on 50k: IRR ≈ 15.2%
    expect(irr).toBeGreaterThan(0.14);
    expect(irr).toBeLessThan(0.17);
    const npvAtIrr = calculateNPV(cashflows, irr);
    expect(Math.abs(npvAtIrr)).toBeLessThan(1);
  });

  // ── 3. Simple payback ──────────────────────────────────────

  it('simple payback: -60000 + 10000/yr = 6.0 years', () => {
    const cashflows = [-60_000, ...new Array(15).fill(10_000)];
    const payback = calculateSimplePayback(cashflows);
    expect(payback).toBeCloseTo(6.0, 1);
  });

  it('simple payback with interpolation: -100000, +60000, +60000 = 1.67 years', () => {
    const cashflows = [-100_000, 60_000, 60_000];
    const payback = calculateSimplePayback(cashflows);
    // After year 1: cumulative = -40000. Year 2 adds 60000.
    // Fraction = 40000/60000 = 0.667
    expect(payback).toBeCloseTo(1.667, 1);
  });

  it('payback = Infinity when never recovers', () => {
    const cashflows = [-100_000, 5_000, 5_000, 5_000]; // total = -85000
    const payback = calculateSimplePayback(cashflows);
    expect(payback).toBe(Infinity);
  });

  // ── 4. Discounted payback ──────────────────────────────────

  it('discounted payback >= simple payback (always true with positive discount rate)', () => {
    const cashflows = [-70_000, ...new Array(15).fill(8_000)];
    const simple = calculateSimplePayback(cashflows);
    const discounted = calculateDiscountedPayback(cashflows, 0.06);
    expect(discounted).toBeGreaterThanOrEqual(simple);
  });

  // ── 5. LCOS hand calculation ───────────────────────────────

  it('LCOS: 70000 invest, 2000/yr maintenance, 50000 kWh/yr, 15yr, 6%, 0% degradation', () => {
    // PV annuity factor @ 6%, 15yr = 9.71225
    // Total discounted cost = 70000 + 2000 × 9.71225 = 70000 + 19424.50 = 89424.50
    // Total discounted energy = 50000 × 9.71225 = 485612.50
    // LCOS = 89424.50 / 485612.50 = 0.18413 EUR/kWh
    const lcos = calculateLCOS(70_000, 2_000, 50_000, 15, 0.06, 0);
    expect(lcos).toBeCloseTo(0.184, 2);
  });

  it('LCOS: with 2.5% degradation reduces energy output', () => {
    const lcosNoDeg = calculateLCOS(70_000, 2_000, 50_000, 15, 0.06, 0);
    const lcosWithDeg = calculateLCOS(70_000, 2_000, 50_000, 15, 0.06, 0.025);
    // More degradation → less energy → higher LCOS
    expect(lcosWithDeg).toBeGreaterThan(lcosNoDeg);
  });

  // ── 6. SDE++ subsidy verification ──────────────────────────

  it('SDE++: 100kWh battery, 60000 kWh discharge, 600 FLH → 1980 EUR/year', () => {
    // SDE base = 0.068, correction = 0.035, subsidy/kWh = 0.033
    // FLH = 60000/100 = 600 >= 500 minimum → full subsidy
    // Annual SDE = 0.033 × 60000 = 1980
    const battery: BatteryConfig = { ...baseBattery, capacityKwh: 100 };
    const subsidy: SubsidyConfig = { ...baseSubsidies, sdeEligible: true, sdeBaseAmount: 0.068 };
    const sde = calculateSDE(battery, subsidy, 60_000);
    expect(sde).toBeCloseTo(1980, 0);
  });

  it('SDE++: below 500 FLH → proportional reduction', () => {
    // 100 kWh, 40000 kWh discharge → 400 FLH < 500
    // reduction factor = 400/500 = 0.8
    // SDE = 0.033 × 40000 × 0.8 = 1056
    const battery: BatteryConfig = { ...baseBattery, capacityKwh: 100 };
    const subsidy: SubsidyConfig = { ...baseSubsidies, sdeEligible: true, sdeBaseAmount: 0.068 };
    const sde = calculateSDE(battery, subsidy, 40_000);
    expect(sde).toBeCloseTo(1056, 0);
  });

  // ── 7. EIA tax benefit verification ────────────────────────

  it('EIA: 70000 invest → deduction 31850 → benefit 8217', () => {
    // Deduction = 70000 × 0.455 = 31850
    // Tax benefit = 31850 × 0.258 = 8217.30
    const eia = calculateEIA(70_000, baseSubsidies);
    expect(eia).toBeCloseTo(8217, 0);
  });

  it('effective investment = gross - EIA benefit', () => {
    const gross = 70_000;
    const net = getEffectiveInvestment(gross, baseSubsidies);
    const eia = calculateEIA(gross, baseSubsidies);
    expect(net).toBeCloseTo(gross - eia, 0);
  });

  // ── 8. Degradation compound effect ─────────────────────────

  it('degradation 2.5% × price growth 3% over 14 years ≈ 1.063', () => {
    // Year 15 factor: (0.975)^14 × (1.03)^14
    // = 0.70248 × 1.51259 = 1.06259
    const factor = Math.pow(0.975, 14) * Math.pow(1.03, 14);
    expect(factor).toBeCloseTo(1.063, 2);
  });

  // ── 9. Pipeline consistency ────────────────────────────────

  it('annualSavings = arbitrageSavings + peakShavingSavings', () => {
    const hourly = generateHospitalProfile(200_000);
    const profile = makeProfile(hourly, 'hospitality');
    const result = calculateFullResult(baseBattery, profile, baseTariffs, baseSubsidies, baseFinancials);
    expect(result.annualSavings).toBeCloseTo(
      result.arbitrageSavings + result.peakShavingSavings,
      2
    );
  });

  it('cashflows[0] = -netInvestment', () => {
    const hourly = generateHospitalProfile(200_000);
    const profile = makeProfile(hourly, 'hospitality');
    const result = calculateFullResult(baseBattery, profile, baseTariffs, baseSubsidies, baseFinancials);
    expect(result.cashflows[0]).toBeCloseTo(-result.netInvestment, 2);
  });

  it('NPV = sum of discounted cashflows (via yearlyBreakdown)', () => {
    const hourly = generateHospitalProfile(200_000);
    const profile = makeProfile(hourly, 'hospitality');
    const result = calculateFullResult(baseBattery, profile, baseTariffs, baseSubsidies, baseFinancials);
    const lastYear = result.yearlyBreakdown[result.yearlyBreakdown.length - 1];
    // cumulativeDiscountedCashflow of last year should approximate NPV
    expect(lastYear.cumulativeDiscountedCashflow).toBeCloseTo(result.npv, 0);
  });

  it('scenario ordering: optimistic NPV >= base >= pessimistic', () => {
    const hourly = generateHospitalProfile(200_000);
    const profile = makeProfile(hourly, 'hospitality');
    const result = calculateFullResult(baseBattery, profile, baseTariffs, baseSubsidies, baseFinancials);
    const opt = result.scenarioResults.find(s => s.scenario === 'optimistic')!;
    const base = result.scenarioResults.find(s => s.scenario === 'base')!;
    const pes = result.scenarioResults.find(s => s.scenario === 'pessimistic')!;
    expect(opt.npv).toBeGreaterThanOrEqual(base.npv);
    expect(base.npv).toBeGreaterThanOrEqual(pes.npv);
  });

  it('subsidyImpactEur = NPV_with - NPV_without', () => {
    const hourly = generateHospitalProfile(200_000);
    const profile = makeProfile(hourly, 'hospitality');
    const result = calculateFullResult(baseBattery, profile, baseTariffs, baseSubsidies, baseFinancials);
    expect(result.subsidyImpactEur).toBeCloseTo(result.npv - result.noSubsidyNpv, 0);
  });
});
