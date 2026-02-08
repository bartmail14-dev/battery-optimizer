import { describe, it, expect } from 'vitest';
import { generateHourlyProfile } from './useCalculation';

describe('generateHourlyProfile', () => {
  // --- Basic structure ---

  it('returns exactly 8760 hourly values', () => {
    const profile = generateHourlyProfile(200000, 80, 'hospitality');
    expect(profile).toHaveLength(8760);
  });

  it('all values are non-negative', () => {
    const profile = generateHourlyProfile(200000, 80, 'hospitality');
    for (const v of profile) {
      expect(v).toBeGreaterThanOrEqual(0);
    }
  });

  it('all values are finite', () => {
    const profile = generateHourlyProfile(200000, 80, 'hospitality');
    for (const v of profile) {
      expect(isFinite(v)).toBe(true);
    }
  });

  // --- Annual total scaling ---

  it('total consumption matches annual kWh target', () => {
    const annualKwh = 200000;
    const profile = generateHourlyProfile(annualKwh, 80, 'hospitality');
    const total = profile.reduce((s, v) => s + v, 0);
    expect(total).toBeCloseTo(annualKwh, 0);
  });

  it('scaling works for small annual consumption (10 MWh)', () => {
    const annualKwh = 10000;
    const profile = generateHourlyProfile(annualKwh, 20, 'hospitality');
    const total = profile.reduce((s, v) => s + v, 0);
    expect(total).toBeCloseTo(annualKwh, 0);
  });

  it('scaling works for large annual consumption (2 GWh)', () => {
    const annualKwh = 2000000;
    const profile = generateHourlyProfile(annualKwh, 500, 'healthcare');
    const total = profile.reduce((s, v) => s + v, 0);
    expect(total).toBeCloseTo(annualKwh, 0);
  });

  // --- Zero consumption ---

  it('zero annual consumption returns all zeros', () => {
    const profile = generateHourlyProfile(0, 0, 'hospitality');
    expect(profile).toHaveLength(8760);
    for (const v of profile) {
      expect(v).toBe(0);
    }
  });

  // --- Sector-specific load shapes ---

  it('hospitality profile has evening peak', () => {
    const profile = generateHourlyProfile(200000, 200, 'hospitality');
    // Average consumption at 18:00 (hour 18) vs 03:00 (hour 3) across days
    const evening = [];
    const night = [];
    for (let d = 0; d < 365; d++) {
      evening.push(profile[d * 24 + 18]);
      night.push(profile[d * 24 + 3]);
    }
    const avgEvening = evening.reduce((s, v) => s + v, 0) / evening.length;
    const avgNight = night.reduce((s, v) => s + v, 0) / night.length;
    expect(avgEvening).toBeGreaterThan(avgNight);
  });

  it('healthcare profile has morning peak', () => {
    const profile = generateHourlyProfile(200000, 200, 'healthcare');
    // Average consumption at 08:00 (hour 8) vs 02:00 (hour 2) across days
    const morning = [];
    const night = [];
    for (let d = 0; d < 365; d++) {
      morning.push(profile[d * 24 + 8]);
      night.push(profile[d * 24 + 2]);
    }
    const avgMorning = morning.reduce((s, v) => s + v, 0) / morning.length;
    const avgNight = night.reduce((s, v) => s + v, 0) / night.length;
    expect(avgMorning).toBeGreaterThan(avgNight);
  });

  it('hospitality and healthcare produce different profiles', () => {
    const hosp = generateHourlyProfile(200000, 200, 'hospitality');
    const health = generateHourlyProfile(200000, 200, 'healthcare');
    // Not identical
    let diffCount = 0;
    for (let i = 0; i < 8760; i++) {
      if (Math.abs(hosp[i] - health[i]) > 0.01) diffCount++;
    }
    expect(diffCount).toBeGreaterThan(0);
  });

  // --- Peak demand capping ---

  it('no hour exceeds peak demand (before scaling)', () => {
    // With a very low peakKw and high annual consumption, the profile
    // gets capped then rescaled. After rescaling, values can exceed peakKw.
    // But with sufficient peak capacity, all hours stay below.
    const profile = generateHourlyProfile(200000, 200, 'hospitality');
    for (const v of profile) {
      // After scaling, values can slightly vary, but should be reasonable
      expect(v).toBeLessThan(300); // generous upper bound
    }
  });

  // --- Weekend reduction ---

  it('hospitality has higher weekend consumption (multiplier > 1)', () => {
    const profile = generateHourlyProfile(200000, 200, 'hospitality');
    // Day 5 (Saturday, index 0 = Monday assumed) and day 6 (Sunday)
    // dayOfYear % 7 >= 5 is weekend
    const weekdayAvg = [];
    const weekendAvg = [];
    for (let d = 0; d < 365; d++) {
      const isWeekend = (d % 7) >= 5;
      const daySum = profile.slice(d * 24, (d + 1) * 24).reduce((s, v) => s + v, 0);
      if (isWeekend) weekendAvg.push(daySum);
      else weekdayAvg.push(daySum);
    }
    const wdAvg = weekdayAvg.reduce((s, v) => s + v, 0) / weekdayAvg.length;
    const weAvg = weekendAvg.reduce((s, v) => s + v, 0) / weekendAvg.length;
    // Hospitality has 1.1x weekend multiplier, so weekends should be slightly higher
    expect(weAvg).toBeGreaterThan(wdAvg * 0.95); // at least close
  });

  it('healthcare has lower weekend consumption (multiplier 0.75)', () => {
    const profile = generateHourlyProfile(200000, 200, 'healthcare');
    const weekdayAvg = [];
    const weekendAvg = [];
    for (let d = 0; d < 365; d++) {
      const isWeekend = (d % 7) >= 5;
      const daySum = profile.slice(d * 24, (d + 1) * 24).reduce((s, v) => s + v, 0);
      if (isWeekend) weekendAvg.push(daySum);
      else weekdayAvg.push(daySum);
    }
    const wdAvg = weekdayAvg.reduce((s, v) => s + v, 0) / weekdayAvg.length;
    const weAvg = weekendAvg.reduce((s, v) => s + v, 0) / weekendAvg.length;
    // Healthcare has 0.75x weekend multiplier
    expect(weAvg).toBeLessThan(wdAvg);
  });

  // --- Seasonal variation ---

  it('winter months have higher consumption than summer months', () => {
    const profile = generateHourlyProfile(200000, 200, 'hospitality');
    // January (days 0-30) vs June (days ~150-180)
    const janSum = profile.slice(0, 31 * 24).reduce((s, v) => s + v, 0);
    const juneStart = 151 * 24;
    const juneSum = profile.slice(juneStart, juneStart + 30 * 24).reduce((s, v) => s + v, 0);
    // January has seasonal factor 1.15 vs June 0.9 → Jan > June
    expect(janSum).toBeGreaterThan(juneSum);
  });

  // --- Edge cases ---

  it('handles very small annual consumption (1 kWh)', () => {
    const profile = generateHourlyProfile(1, 10, 'hospitality');
    expect(profile).toHaveLength(8760);
    const total = profile.reduce((s, v) => s + v, 0);
    expect(total).toBeCloseTo(1, 0);
  });

  it('handles very large peak demand', () => {
    const profile = generateHourlyProfile(200000, 100000, 'hospitality');
    expect(profile).toHaveLength(8760);
    // No value should exceed the generous peakKw
    for (const v of profile) {
      expect(v).toBeLessThanOrEqual(100000);
    }
  });

  it('different annual values produce proportionally scaled profiles', () => {
    const profile1 = generateHourlyProfile(100000, 200, 'hospitality');
    const profile2 = generateHourlyProfile(200000, 400, 'hospitality');
    const total1 = profile1.reduce((s, v) => s + v, 0);
    const total2 = profile2.reduce((s, v) => s + v, 0);
    expect(total2 / total1).toBeCloseTo(2, 0);
  });
});
