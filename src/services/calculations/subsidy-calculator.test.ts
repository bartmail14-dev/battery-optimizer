import { describe, it, expect } from 'vitest';
import { calculateSDE, calculateEIA, getEffectiveInvestment } from './subsidy-calculator';
import type { BatteryConfig, SubsidyConfig } from '../../types';

const baseBattery: BatteryConfig = {
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

const baseSubsidies: SubsidyConfig = {
  sdeEligible: true,
  sdeBaseAmount: 0.068,
  eiaPercentage: 0.455,
  eiaMaxDeduction: 136000000,
};

describe('calculateSDE', () => {
  it('returns 0 when SDE is not eligible', () => {
    expect(calculateSDE(baseBattery, { ...baseSubsidies, sdeEligible: false }, 50000)).toBe(0);
  });

  it('returns 0 for zero discharge', () => {
    expect(calculateSDE(baseBattery, baseSubsidies, 0)).toBe(0);
  });

  it('returns 0 for negative discharge', () => {
    expect(calculateSDE(baseBattery, baseSubsidies, -1000)).toBe(0);
  });

  it('calculates positive subsidy for valid discharge', () => {
    const result = calculateSDE(baseBattery, baseSubsidies, 50000);
    expect(result).toBeGreaterThan(0);
  });

  it('reduces subsidy proportionally when below minimum full load hours', () => {
    const lowDischarge = calculateSDE(baseBattery, baseSubsidies, 10000);
    const highDischarge = calculateSDE(baseBattery, baseSubsidies, 60000);
    expect(lowDischarge).toBeLessThan(highDischarge);
  });

  it('subsidy scales with discharge volume', () => {
    const sde1 = calculateSDE(baseBattery, baseSubsidies, 50000);
    const sde2 = calculateSDE(baseBattery, baseSubsidies, 100000);
    expect(sde2).toBeGreaterThan(sde1);
  });

  // --- Extended edge cases ---

  it('exact hand calculation: (0.068 - 0.035) * 60000 = 1980', () => {
    // 100 kWh battery, 60000 kWh = 600 full load hours > 500 minimum
    const result = calculateSDE(baseBattery, baseSubsidies, 60000);
    expect(result).toBeCloseTo(1980, 0);
  });

  it('zero capacity battery returns 0 (division by zero guard)', () => {
    const zeroBattery: BatteryConfig = { ...baseBattery, capacityKwh: 0 };
    const result = calculateSDE(zeroBattery, baseSubsidies, 50000);
    expect(result).toBe(0);
  });

  it('exactly at minimum full load hours boundary (500 FLH)', () => {
    // 100 kWh * 500 FLH = 50000 kWh
    const result = calculateSDE(baseBattery, baseSubsidies, 50000);
    // Should get full subsidy at exactly 500 FLH
    expect(result).toBeCloseTo(0.033 * 50000, 0);
  });

  it('just below minimum FLH (499) gets proportional reduction', () => {
    // 100 kWh * 499 = 49900 kWh → fullLoadHours = 499 < 500
    const result = calculateSDE(baseBattery, baseSubsidies, 49900);
    const fullSubsidy = 0.033 * 49900;
    // Should be less than full subsidy due to proportional reduction
    expect(result).toBeLessThan(fullSubsidy);
    expect(result).toBeGreaterThan(0);
  });

  it('custom sdeBaseAmount overrides default', () => {
    const customSubsidy: SubsidyConfig = { ...baseSubsidies, sdeBaseAmount: 0.10 };
    // (0.10 - 0.035) * 60000 = 3900
    const result = calculateSDE(baseBattery, customSubsidy, 60000);
    expect(result).toBeCloseTo(3900, 0);
  });

  it('returns 0 when base amount equals correction amount', () => {
    const equalSubsidy: SubsidyConfig = { ...baseSubsidies, sdeBaseAmount: 0.035 };
    const result = calculateSDE(baseBattery, equalSubsidy, 60000);
    expect(result).toBe(0);
  });

  it('returns 0 when base amount is below correction amount', () => {
    const lowSubsidy: SubsidyConfig = { ...baseSubsidies, sdeBaseAmount: 0.02 };
    const result = calculateSDE(baseBattery, lowSubsidy, 60000);
    expect(result).toBe(0);
  });

  it('large battery with high discharge gets large subsidy', () => {
    const bigBattery: BatteryConfig = { ...baseBattery, capacityKwh: 1000 };
    // 1000 kWh, 600000 kWh discharge = 600 FLH > 500
    const result = calculateSDE(bigBattery, baseSubsidies, 600000);
    expect(result).toBeCloseTo(0.033 * 600000, 0);
  });
});

describe('calculateEIA', () => {
  it('returns 0 for investment below minimum', () => {
    expect(calculateEIA(2000, baseSubsidies)).toBe(0);
  });

  it('returns 0 for investment at exactly below minimum (2499)', () => {
    expect(calculateEIA(2499, baseSubsidies)).toBe(0);
  });

  it('returns positive for investment at exactly minimum (2500)', () => {
    const result = calculateEIA(2500, baseSubsidies);
    expect(result).toBeGreaterThan(0);
    // 2500 * 0.455 * 0.258 = 293.475
    expect(result).toBeCloseTo(293.475, 0);
  });

  it('returns 0 for zero investment', () => {
    expect(calculateEIA(0, baseSubsidies)).toBe(0);
  });

  it('calculates correct EIA benefit', () => {
    const result = calculateEIA(70000, baseSubsidies);
    // 70000 * 0.455 * 0.258 = 8217.30
    expect(result).toBeCloseTo(8217.3, 0);
  });

  it('EIA scales with investment', () => {
    const small = calculateEIA(50000, baseSubsidies);
    const large = calculateEIA(200000, baseSubsidies);
    expect(large).toBeGreaterThan(small);
  });

  it('respects the maximum deduction', () => {
    const huge = calculateEIA(1000000000, baseSubsidies);
    const maxBenefit = 136000000 * 0.258;
    expect(huge).toBeLessThanOrEqual(maxBenefit + 1);
  });

  it('exact maximum deduction hand calculation', () => {
    const huge = calculateEIA(1000000000, baseSubsidies);
    // Max deduction: 136M * 0.258 = 35,088,000
    expect(huge).toBeCloseTo(35088000, 0);
  });

  it('custom EIA percentage works', () => {
    const custom: SubsidyConfig = { ...baseSubsidies, eiaPercentage: 0.30 };
    const result = calculateEIA(100000, custom);
    // 100000 * 0.30 * 0.258 = 7740
    expect(result).toBeCloseTo(7740, 0);
  });

  it('custom max deduction works', () => {
    const custom: SubsidyConfig = { ...baseSubsidies, eiaMaxDeduction: 10000 };
    const result = calculateEIA(100000, custom);
    // min(100000 * 0.455, 10000) * 0.258 = 10000 * 0.258 = 2580
    expect(result).toBeCloseTo(2580, 0);
  });
});

describe('getEffectiveInvestment', () => {
  it('reduces investment by EIA benefit', () => {
    const effective = getEffectiveInvestment(70000, baseSubsidies);
    const eia = calculateEIA(70000, baseSubsidies);
    expect(effective).toBeCloseTo(70000 - eia, 0);
  });

  it('never returns negative', () => {
    expect(getEffectiveInvestment(100, baseSubsidies)).toBeGreaterThanOrEqual(0);
  });

  it('returns full investment when EIA is not applicable (below min)', () => {
    const effective = getEffectiveInvestment(1000, baseSubsidies);
    expect(effective).toBe(1000);
  });

  it('returns zero when investment equals zero', () => {
    expect(getEffectiveInvestment(0, baseSubsidies)).toBe(0);
  });

  it('typical hotel battery: ~€70k investment → ~€62k effective', () => {
    const effective = getEffectiveInvestment(70000, baseSubsidies);
    expect(effective).toBeGreaterThan(60000);
    expect(effective).toBeLessThan(70000);
  });
});
