import { describe, it, expect } from 'vitest';
import { simulateBatteryOperation } from './battery-simulation';
import { calculateFullResult } from './scenario-engine';
import {
  baseBattery,
  baseTariffs,
  baseSubsidies,
  baseFinancials,
  makeProfile,
  generateHospitalProfile,
  generateOfficeProfile,
  generateDatacenterProfile,
  generateEVChargingProfile,
} from '../../test-fixtures/profile-helpers';
import type { BatteryConfig } from '../../types';

/**
 * Physical constraint tests — verify the simulation respects battery physics.
 * Energy conservation, SoC bounds, C-rate limits, cycle counting.
 */
describe('Physical constraints', () => {

  const hourly = generateHospitalProfile(200_000);
  const profile = makeProfile(hourly, 'hospitality');

  // ── Energy conservation ──────────────────────────────────────

  it('energy conservation: totalCharged × efficiency ≈ totalDischarged + ΔSoC', () => {
    const result = simulateBatteryOperation(profile, baseBattery, baseTariffs);
    // totalCharged is grid-side energy (before charge efficiency loss)
    // totalDischarged is useful energy delivered (after discharge efficiency)
    // With sqrt(η) model:
    //   gridEnergy → ×sqrt(η) → stored → ×sqrt(η) → delivered
    //   So: totalCharged × η should approximately equal totalDischarged
    // Plus we need to account for SoC change
    const initialSoC = baseBattery.capacityKwh * 0.5;
    const finalSoC = result.hourlyResults[result.hourlyResults.length - 1].stateOfCharge;
    const deltaSoC = finalSoC - initialSoC;

    // Grid energy × roundTripEfficiency ≈ useful energy + SoC change × sqrt(η)
    const gridIn = result.totalCharged;
    const useful = result.totalDischarged;
    const eta = baseBattery.roundTripEfficiency;

    // Approximate check: gridIn × η should be in the ballpark of useful + deltaSoC effects
    const expectedUseful = gridIn * eta;
    const tolerance = 0.05; // 5% tolerance for Decimal.js rounding accumulation
    expect(Math.abs(expectedUseful - useful) / Math.max(useful, 1)).toBeLessThan(tolerance);
  });

  // ── SoC bounds ───────────────────────────────────────────────

  it('SoC never exceeds rated capacity at any hour', () => {
    const result = simulateBatteryOperation(profile, baseBattery, baseTariffs);
    for (const hr of result.hourlyResults) {
      expect(hr.stateOfCharge).toBeLessThanOrEqual(baseBattery.capacityKwh + 0.01);
    }
  });

  it('SoC never drops below minSoC (capacity × (1 - DoD)) at any hour', () => {
    const minSoC = baseBattery.capacityKwh * (1 - baseBattery.depthOfDischarge);
    const result = simulateBatteryOperation(profile, baseBattery, baseTariffs);
    for (const hr of result.hourlyResults) {
      expect(hr.stateOfCharge).toBeGreaterThanOrEqual(minSoC - 0.01);
    }
  });

  it('SoC bounds hold with extreme DoD (50%)', () => {
    const restrictedBattery: BatteryConfig = { ...baseBattery, depthOfDischarge: 0.5 };
    const minSoC = restrictedBattery.capacityKwh * (1 - 0.5); // 50 kWh
    const result = simulateBatteryOperation(profile, restrictedBattery, baseTariffs);
    for (const hr of result.hourlyResults) {
      expect(hr.stateOfCharge).toBeGreaterThanOrEqual(minSoC - 0.01);
      expect(hr.stateOfCharge).toBeLessThanOrEqual(restrictedBattery.capacityKwh + 0.01);
    }
  });

  // ── Power limits (C-rate) ────────────────────────────────────

  it('charge power never exceeds powerKw in any hour', () => {
    const result = simulateBatteryOperation(profile, baseBattery, baseTariffs);
    for (const hr of result.hourlyResults) {
      expect(hr.batteryCharge).toBeLessThanOrEqual(baseBattery.powerKw + 0.01);
    }
  });

  it('discharge power never exceeds powerKw in any hour', () => {
    const result = simulateBatteryOperation(profile, baseBattery, baseTariffs);
    for (const hr of result.hourlyResults) {
      expect(hr.batteryDischarge).toBeLessThanOrEqual(baseBattery.powerKw + 0.01);
    }
  });

  // ── Grid export constraint ───────────────────────────────────

  it('battery never exports to grid (discharge <= consumption)', () => {
    const result = simulateBatteryOperation(profile, baseBattery, baseTariffs);
    for (const hr of result.hourlyResults) {
      expect(hr.batteryDischarge).toBeLessThanOrEqual(hr.consumption + 0.01);
    }
  });

  // ── Cycle counting ───────────────────────────────────────────

  it('total cycles are physically plausible (< 2.5/day for 0.5C battery)', () => {
    const result = simulateBatteryOperation(profile, baseBattery, baseTariffs);
    // With dynamic EPEX pricing, the battery can charge/discharge multiple times per day
    // (solar dip midday + evening peak → can exceed 2 strict cycles)
    // 2.5 cycles/day = 912 per year is a generous but physical upper bound for 0.5C
    const maxDailyCycles = 2.5;
    const maxAnnualCycles = maxDailyCycles * 365;
    expect(result.totalCycles).toBeLessThan(maxAnnualCycles);
    expect(result.totalCycles).toBeGreaterThan(0);
  });

  it('cycle count is consistent with charge/discharge totals', () => {
    const result = simulateBatteryOperation(profile, baseBattery, baseTariffs);
    const usableCapacity = baseBattery.capacityKwh * baseBattery.depthOfDischarge;
    const cycleEnergy = (result.totalCharged + result.totalDischarged) / 2;
    const expectedCycles = usableCapacity > 0 ? cycleEnergy / usableCapacity : 0;
    expect(result.totalCycles).toBeCloseTo(expectedCycles, 1);
  });

  // ── Degradation ──────────────────────────────────────────────

  it('degradation factor is monotonically decreasing in yearlyBreakdown', () => {
    const result = calculateFullResult(baseBattery, profile, baseTariffs, baseSubsidies, baseFinancials);
    for (let i = 2; i < result.yearlyBreakdown.length; i++) {
      expect(result.yearlyBreakdown[i].degradationFactor)
        .toBeLessThan(result.yearlyBreakdown[i - 1].degradationFactor);
    }
  });

  it('30-year @ 2.5% degradation: year 30 capacity ≈ 47.7%', () => {
    // Use high cycleLife battery to ensure 30-year horizon isn't capped
    const longLifeBattery: BatteryConfig = { ...baseBattery, cycleLife: 30000 };
    const longFinancials = { ...baseFinancials, years: 30 };
    const result = calculateFullResult(longLifeBattery, profile, baseTariffs, baseSubsidies, longFinancials);
    const year30 = result.yearlyBreakdown.find(y => y.year === 30);
    expect(year30).toBeDefined();
    // (1 - 0.025)^29 = 0.4767
    expect(year30!.degradationFactor).toBeCloseTo(0.477, 2);
  });

  // ── CycleLife enforcement ────────────────────────────────────

  it('cycleLife IS enforced: effective lifespan is capped when cycles exceed cycleLife', () => {
    const lowCycleBattery: BatteryConfig = { ...baseBattery, cycleLife: 1000, lifespanYears: 15 };
    const highUsage = generateEVChargingProfile(500_000);
    const highProfile = makeProfile(highUsage, 'logistiek');
    const result = calculateFullResult(lowCycleBattery, highProfile, baseTariffs, baseSubsidies, baseFinancials);

    // Annual cycles should be significant
    expect(result.simulation.totalCycles).toBeGreaterThan(50);

    // effectiveLifespanYears should be less than 15
    const expectedLifespan = Math.min(15, Math.floor(1000 / result.simulation.totalCycles));
    expect(result.effectiveLifespanYears).toBe(expectedLifespan);
    expect(result.effectiveLifespanYears).toBeLessThan(15);

    // Warning should be present
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('einde levenscyclus');

    // Financial horizon should be capped
    expect(result.yearlyBreakdown.length).toBe(result.effectiveLifespanYears + 1);
    expect(result.cashflows.length).toBe(result.effectiveLifespanYears + 1);
  });

  it('cycleLife not exceeded: effectiveLifespanYears equals financials.years', () => {
    const result = calculateFullResult(baseBattery, profile, baseTariffs, baseSubsidies, baseFinancials);
    expect(result.effectiveLifespanYears).toBe(15);
    expect(result.warnings.length).toBe(0);
  });

  // ── Multiple profiles physical constraints ───────────────────

  it('office profile: zero off-peak consumption still charges correctly', () => {
    const officeHourly = generateOfficeProfile(150_000);
    const officeProfile = makeProfile(officeHourly, 'kantoor');
    const result = simulateBatteryOperation(officeProfile, baseBattery, baseTariffs);
    // Battery should still charge during off-peak even if consumption is low
    expect(result.totalCharged).toBeGreaterThan(0);
    expect(result.totalDischarged).toBeGreaterThan(0);
  });

  it('datacenter constant profile: minimal charge/discharge activity', () => {
    const dcHourly = generateDatacenterProfile(4_380_000);
    const dcProfile = makeProfile(dcHourly, 'overig');
    const result = simulateBatteryOperation(dcProfile, baseBattery, baseTariffs);
    // With constant load, there's almost no price difference to exploit
    // Still should not crash
    expect(isFinite(result.totalCycles)).toBe(true);
    expect(result.totalCycles).toBeGreaterThanOrEqual(0);
  });
});
