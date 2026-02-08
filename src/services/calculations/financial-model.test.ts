import { describe, it, expect } from 'vitest';
import {
  calculateNPV,
  calculateIRR,
  calculateSimplePayback,
  calculateDiscountedPayback,
  calculateLCOS,
  generateCashflows,
} from './financial-model';

// ═══════════════════════════════════════════════════════════════
// NPV
// ═══════════════════════════════════════════════════════════════

describe('calculateNPV', () => {
  it('returns 0 for empty cashflows', () => {
    expect(calculateNPV([], 0.06)).toBe(0);
  });

  it('returns initial investment for single cashflow at rate 0', () => {
    expect(calculateNPV([-100000], 0)).toBeCloseTo(-100000);
  });

  it('correctly discounts a simple 2-year investment', () => {
    // NPV = -100000 + 60000/1.1 + 60000/1.21 = 4132.23
    const npv = calculateNPV([-100000, 60000, 60000], 0.1);
    expect(npv).toBeCloseTo(4132.23, 0);
  });

  it('returns negative NPV for bad investment', () => {
    const npv = calculateNPV([-100000, 10000, 10000, 10000], 0.1);
    expect(npv).toBeLessThan(0);
  });

  it('handles zero discount rate (no discounting)', () => {
    const npv = calculateNPV([-100, 50, 50, 50], 0);
    expect(npv).toBeCloseTo(50);
  });

  // --- Extended edge cases ---

  it('handles very high discount rate (100%)', () => {
    // Year 0: -100, Year 1: +300 at 100% → NPV = -100 + 300/2 = 50
    const npv = calculateNPV([-100, 300], 1.0);
    expect(npv).toBeCloseTo(50);
  });

  it('handles all-positive cashflows (no investment)', () => {
    const npv = calculateNPV([1000, 1000, 1000], 0.05);
    expect(npv).toBeGreaterThan(0);
  });

  it('handles all-negative cashflows', () => {
    const npv = calculateNPV([-1000, -1000, -1000], 0.05);
    expect(npv).toBeLessThan(0);
  });

  it('handles a long cashflow series (30 years)', () => {
    const cfs = [-100000, ...new Array(30).fill(10000)];
    const npv = calculateNPV(cfs, 0.06);
    expect(isFinite(npv)).toBe(true);
    // At 6%, PV of 30 x 10000 ≈ 137648, so NPV ≈ 37648
    expect(npv).toBeGreaterThan(30000);
    expect(npv).toBeLessThan(45000);
  });

  it('handles very small cashflows without precision loss', () => {
    const npv = calculateNPV([-0.01, 0.006, 0.006], 0.05);
    expect(isFinite(npv)).toBe(true);
    expect(npv).toBeGreaterThan(0);
  });

  it('NPV decreases as discount rate increases', () => {
    const cfs = [-100000, 30000, 30000, 30000, 30000, 30000];
    const npvLow = calculateNPV(cfs, 0.02);
    const npvMid = calculateNPV(cfs, 0.08);
    const npvHigh = calculateNPV(cfs, 0.15);
    expect(npvLow).toBeGreaterThan(npvMid);
    expect(npvMid).toBeGreaterThan(npvHigh);
  });

  it('manual hand-calculation: 3 years at 5%', () => {
    // -50000 + 20000/1.05 + 20000/1.1025 + 20000/1.157625
    // = -50000 + 19047.62 + 18140.59 + 17276.75 = 4464.96
    const npv = calculateNPV([-50000, 20000, 20000, 20000], 0.05);
    expect(npv).toBeCloseTo(4464.96, 0);
  });
});

// ═══════════════════════════════════════════════════════════════
// IRR
// ═══════════════════════════════════════════════════════════════

describe('calculateIRR', () => {
  it('returns NaN for insufficient cashflows', () => {
    expect(calculateIRR([100])).toBeNaN();
  });

  it('returns NaN when all cashflows are positive', () => {
    expect(calculateIRR([100, 200, 300])).toBeNaN();
  });

  it('returns NaN when all cashflows are negative', () => {
    expect(calculateIRR([-100, -200, -300])).toBeNaN();
  });

  it('calculates IRR for a simple investment', () => {
    const irr = calculateIRR([-100, 110]);
    expect(irr).toBeCloseTo(0.1, 2);
  });

  it('calculates IRR for multi-year investment', () => {
    const irr = calculateIRR([-1000, 400, 400, 400]);
    expect(irr).toBeCloseTo(0.097, 1);
  });

  it('returns approximately 0 for break-even investment', () => {
    const irr = calculateIRR([-100, 100]);
    expect(irr).toBeCloseTo(0, 2);
  });

  // --- Extended edge cases ---

  it('calculates high IRR for very profitable investment', () => {
    // -100 then +500 → IRR = 400%
    const irr = calculateIRR([-100, 500]);
    expect(irr).toBeCloseTo(4.0, 1);
  });

  it('calculates negative IRR for losing investment', () => {
    // -100 then +50 → IRR = -50%
    const irr = calculateIRR([-100, 50]);
    expect(irr).toBeCloseTo(-0.5, 1);
  });

  it('handles cashflows with zeros interspersed', () => {
    const irr = calculateIRR([-1000, 0, 0, 0, 2000]);
    expect(isFinite(irr)).toBe(true);
    expect(irr).toBeGreaterThan(0);
  });

  it('handles long investment horizon (20 years)', () => {
    const cfs = [-100000, ...new Array(20).fill(10000)];
    const irr = calculateIRR(cfs);
    expect(isFinite(irr)).toBe(true);
    // Should be around 7-8%
    expect(irr).toBeGreaterThan(0.05);
    expect(irr).toBeLessThan(0.12);
  });

  it('IRR is consistent with NPV: NPV(IRR) ≈ 0', () => {
    const cfs = [-50000, 15000, 15000, 15000, 15000, 15000];
    const irr = calculateIRR(cfs);
    if (isFinite(irr)) {
      const npvAtIrr = calculateNPV(cfs, irr);
      expect(Math.abs(npvAtIrr)).toBeLessThan(1); // Should be near zero
    }
  });

  it('respects custom tolerance', () => {
    const irr1 = calculateIRR([-1000, 400, 400, 400], 1e-10);
    const irr2 = calculateIRR([-1000, 400, 400, 400], 1e-3);
    // Both should converge to similar values
    expect(Math.abs(irr1 - irr2)).toBeLessThan(0.01);
  });

  it('handles very small annual returns', () => {
    const cfs = [-100000, ...new Array(15).fill(7000)];
    const irr = calculateIRR(cfs);
    expect(isFinite(irr)).toBe(true);
    // Slightly above 1%
    expect(irr).toBeGreaterThan(0);
    expect(irr).toBeLessThan(0.05);
  });
});

// ═══════════════════════════════════════════════════════════════
// Simple Payback
// ═══════════════════════════════════════════════════════════════

describe('calculateSimplePayback', () => {
  it('returns Infinity for empty cashflows', () => {
    expect(calculateSimplePayback([])).toBe(Infinity);
  });

  it('returns Infinity when investment never pays back', () => {
    expect(calculateSimplePayback([-100000, 1000, 1000])).toBe(Infinity);
  });

  it('returns 0 when initial cashflow is positive', () => {
    expect(calculateSimplePayback([100, 200])).toBe(0);
  });

  it('correctly calculates payback with equal cashflows', () => {
    const payback = calculateSimplePayback([-100000, 25000, 25000, 25000, 25000, 25000]);
    expect(payback).toBeCloseTo(4, 1);
  });

  it('interpolates within a year', () => {
    const payback = calculateSimplePayback([-100000, 60000, 60000]);
    expect(payback).toBeCloseTo(1.67, 1);
  });

  // --- Extended edge cases ---

  it('payback in exactly 1 year', () => {
    const payback = calculateSimplePayback([-50000, 50000, 10000]);
    expect(payback).toBeCloseTo(1.0, 1);
  });

  it('payback in the last available year', () => {
    const payback = calculateSimplePayback([-100000, 10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000]);
    expect(payback).toBeCloseTo(10, 1);
  });

  it('handles growing cashflows', () => {
    // -100k, then 10k, 20k, 30k, 40k, 50k (cumulative: -90, -70, -40, 0, +50)
    const payback = calculateSimplePayback([-100000, 10000, 20000, 30000, 40000, 50000]);
    // Cumulative at year 3: -40000, at year 4: 0 → payback = 4
    expect(payback).toBeCloseTo(4, 1);
  });

  it('handles single year of all cashflows', () => {
    const payback = calculateSimplePayback([-100000, 200000]);
    expect(payback).toBeCloseTo(0.5, 1);
  });

  it('handles all-negative cashflows (Infinity)', () => {
    expect(calculateSimplePayback([-100, -200, -300])).toBe(Infinity);
  });

  it('returns Infinity when only year 0 is provided', () => {
    expect(calculateSimplePayback([-100000])).toBe(Infinity);
  });
});

// ═══════════════════════════════════════════════════════════════
// Discounted Payback
// ═══════════════════════════════════════════════════════════════

describe('calculateDiscountedPayback', () => {
  it('returns Infinity for empty cashflows', () => {
    expect(calculateDiscountedPayback([], 0.1)).toBe(Infinity);
  });

  it('is longer than simple payback', () => {
    const cashflows = [-100000, 30000, 30000, 30000, 30000, 30000];
    const simple = calculateSimplePayback(cashflows);
    const discounted = calculateDiscountedPayback(cashflows, 0.1);
    expect(discounted).toBeGreaterThan(simple);
  });

  it('equals simple payback at 0% discount rate', () => {
    const cashflows = [-100000, 50000, 50000, 50000];
    const simple = calculateSimplePayback(cashflows);
    const discounted = calculateDiscountedPayback(cashflows, 0);
    expect(discounted).toBeCloseTo(simple, 1);
  });

  // --- Extended edge cases ---

  it('higher discount rate → longer payback', () => {
    const cashflows = [-100000, 25000, 25000, 25000, 25000, 25000, 25000];
    const low = calculateDiscountedPayback(cashflows, 0.02);
    const mid = calculateDiscountedPayback(cashflows, 0.08);
    const high = calculateDiscountedPayback(cashflows, 0.15);
    expect(mid).toBeGreaterThan(low);
    expect(high).toBeGreaterThanOrEqual(mid);
  });

  it('returns Infinity when discounted cashflows never recover investment', () => {
    // High discount rate makes future cashflows worth very little
    const cashflows = [-100000, 12000, 12000, 12000, 12000];
    const payback = calculateDiscountedPayback(cashflows, 0.5);
    expect(payback).toBe(Infinity);
  });

  it('handles single large repayment', () => {
    const cashflows = [-100000, 0, 0, 0, 200000];
    const simple = calculateSimplePayback(cashflows);
    const discounted = calculateDiscountedPayback(cashflows, 0.1);
    expect(isFinite(simple)).toBe(true);
    expect(discounted).toBeGreaterThan(simple);
  });
});

// ═══════════════════════════════════════════════════════════════
// LCOS
// ═══════════════════════════════════════════════════════════════

describe('calculateLCOS', () => {
  it('returns Infinity for zero discharge', () => {
    expect(calculateLCOS(100000, 2000, 0, 15, 0.06, 0.025)).toBe(Infinity);
  });

  it('returns Infinity for zero lifespan', () => {
    expect(calculateLCOS(100000, 2000, 50000, 0, 0.06, 0.025)).toBe(Infinity);
  });

  it('returns Infinity for negative discharge', () => {
    expect(calculateLCOS(100000, 2000, -1000, 15, 0.06, 0.025)).toBe(Infinity);
  });

  it('produces a reasonable LCOS for typical battery', () => {
    const lcos = calculateLCOS(70000, 2000, 50000, 15, 0.06, 0.025);
    expect(lcos).toBeGreaterThan(0.05);
    expect(lcos).toBeLessThan(0.50);
  });

  it('LCOS increases with higher investment', () => {
    const lcos1 = calculateLCOS(50000, 2000, 50000, 15, 0.06, 0.025);
    const lcos2 = calculateLCOS(100000, 2000, 50000, 15, 0.06, 0.025);
    expect(lcos2).toBeGreaterThan(lcos1);
  });

  // --- Extended edge cases ---

  it('zero maintenance gives lower LCOS', () => {
    const withMaintenance = calculateLCOS(70000, 5000, 50000, 15, 0.06, 0.025);
    const noMaintenance = calculateLCOS(70000, 0, 50000, 15, 0.06, 0.025);
    expect(noMaintenance).toBeLessThan(withMaintenance);
  });

  it('zero degradation gives lower LCOS than high degradation', () => {
    const noDeg = calculateLCOS(70000, 2000, 50000, 15, 0.06, 0);
    const highDeg = calculateLCOS(70000, 2000, 50000, 15, 0.06, 0.05);
    expect(noDeg).toBeLessThan(highDeg);
  });

  it('longer lifespan reduces LCOS', () => {
    const short = calculateLCOS(70000, 2000, 50000, 5, 0.06, 0.025);
    const long = calculateLCOS(70000, 2000, 50000, 25, 0.06, 0.025);
    expect(long).toBeLessThan(short);
  });

  it('1-year lifespan produces finite LCOS', () => {
    const lcos = calculateLCOS(70000, 2000, 50000, 1, 0.06, 0.025);
    expect(isFinite(lcos)).toBe(true);
    expect(lcos).toBeGreaterThan(1.0); // Very high for 1-year
  });

  it('higher discount rate increases LCOS', () => {
    const lowRate = calculateLCOS(70000, 2000, 50000, 15, 0.02, 0.025);
    const highRate = calculateLCOS(70000, 2000, 50000, 15, 0.15, 0.025);
    expect(highRate).toBeGreaterThan(lowRate);
  });

  it('very high discharge volume gives low LCOS', () => {
    const lcos = calculateLCOS(70000, 2000, 500000, 15, 0.06, 0.025);
    expect(lcos).toBeLessThan(0.05); // Lots of throughput
  });
});

// ═══════════════════════════════════════════════════════════════
// generateCashflows
// ═══════════════════════════════════════════════════════════════

describe('generateCashflows', () => {
  it('generates correct number of cashflows', () => {
    const cfs = generateCashflows(100000, 15000, 2000, 15, 0.03, 0.025);
    expect(cfs).toHaveLength(16);
  });

  it('year 0 is the negative investment', () => {
    const cfs = generateCashflows(100000, 15000, 2000, 10, 0.03, 0.025);
    expect(cfs[0]).toBe(-100000);
  });

  it('year 1 cashflow equals savings minus maintenance', () => {
    const cfs = generateCashflows(100000, 15000, 2000, 10, 0.03, 0.025);
    expect(cfs[1]).toBeCloseTo(13000, 0);
  });

  it('savings grow with electricity prices but shrink with degradation', () => {
    const cfs = generateCashflows(100000, 15000, 2000, 10, 0.05, 0.03);
    expect(cfs[2]).not.toEqual(cfs[1]);
  });

  it('includes subsidies when provided', () => {
    const withoutSubsidy = generateCashflows(100000, 15000, 2000, 10, 0.03, 0.025, 0);
    const withSubsidy = generateCashflows(100000, 15000, 2000, 10, 0.03, 0.025, 3000);
    for (let i = 1; i <= 10; i++) {
      expect(withSubsidy[i]).toBeGreaterThan(withoutSubsidy[i]);
    }
  });

  // --- Extended edge cases ---

  it('year 2 hand calculation: price growth 3%, degradation 2.5%', () => {
    const cfs = generateCashflows(100000, 15000, 2000, 10, 0.03, 0.025);
    // Year 2: 15000 * 1.03^1 * 0.975^1 - 2000 = 15000 * 1.03 * 0.975 - 2000
    // = 15000 * 1.004250 - 2000 = 15063.75 - 2000 = 13063.75
    expect(cfs[2]).toBeCloseTo(13063.75, 0);
  });

  it('year 5 hand calculation', () => {
    const cfs = generateCashflows(100000, 15000, 2000, 10, 0.03, 0.025);
    // Year 5: 15000 * 1.03^4 * 0.975^4 - 2000
    const priceGrowth = Math.pow(1.03, 4);
    const degradation = Math.pow(0.975, 4);
    const expected = 15000 * priceGrowth * degradation - 2000;
    expect(cfs[5]).toBeCloseTo(expected, 0);
  });

  it('cashflows decrease when degradation dominates price growth', () => {
    // degradation 5% > price growth 1% → declining cashflows
    const cfs = generateCashflows(100000, 15000, 2000, 10, 0.01, 0.05);
    expect(cfs[10]).toBeLessThan(cfs[1]);
  });

  it('cashflows increase when price growth dominates degradation', () => {
    // price growth 8% > degradation 2% → growing cashflows
    const cfs = generateCashflows(100000, 15000, 2000, 10, 0.08, 0.02);
    expect(cfs[10]).toBeGreaterThan(cfs[1]);
  });

  it('zero price growth and zero degradation gives constant cashflows', () => {
    const cfs = generateCashflows(100000, 15000, 2000, 5, 0, 0);
    for (let i = 1; i <= 5; i++) {
      expect(cfs[i]).toBeCloseTo(13000, 0);
    }
  });

  it('handles negative annual savings (loss scenario)', () => {
    const cfs = generateCashflows(100000, -5000, 2000, 5, 0.03, 0.025);
    // Year 1: -5000 - 2000 = -7000
    expect(cfs[1]).toBeCloseTo(-7000, 0);
    // All years should be negative
    for (let i = 1; i <= 5; i++) {
      expect(cfs[i]).toBeLessThan(0);
    }
  });

  it('subsidy of exactly maintenance cost gives savings-only cashflows', () => {
    const cfs = generateCashflows(100000, 15000, 3000, 5, 0, 0, 3000);
    // Year 1: 15000 - 3000 + 3000 = 15000
    expect(cfs[1]).toBeCloseTo(15000, 0);
  });

  it('zero years returns only the investment', () => {
    const cfs = generateCashflows(100000, 15000, 2000, 0, 0.03, 0.025);
    expect(cfs).toHaveLength(1);
    expect(cfs[0]).toBe(-100000);
  });
});
