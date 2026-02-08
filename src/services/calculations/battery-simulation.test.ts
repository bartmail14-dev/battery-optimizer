import { describe, it, expect } from 'vitest';
import { simulateBatteryOperation, getMonthlyBreakdown } from './battery-simulation';
import type { BatteryConfig, EnergyProfile, TariffStructure } from '../../types';
import { EPEX_TYPICAL_PROFILE } from '../../constants';

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

const baseTariffs: TariffStructure = {
  commodityRatePerKwh: 0.12,
  peakRate: 0.22,
  offPeakRate: 0.14,
  networkTariffPerKw: 27.5,
  energyTaxPerKwh: 0.01312,
  odeSurchargePerKwh: 0.00642,
  feedInTariffPerKwh: 0.07,
  pricingMode: 'fixed',
};

function makeProfile(avgKwh: number): EnergyProfile {
  return {
    hourlyConsumptionKwh: new Array(8760).fill(avgKwh),
    peakDemandKw: avgKwh * 1.5,
    annualConsumptionKwh: avgKwh * 8760,
    connectionCapacityKw: avgKwh * 2,
    sector: 'hospitality',
  };
}

describe('simulateBatteryOperation', () => {
  it('produces 8760 hourly results', () => {
    const profile = makeProfile(20);
    const result = simulateBatteryOperation(profile, baseBattery, baseTariffs);
    expect(result.hourlyResults).toHaveLength(8760);
  });

  it('cost with battery is less than or equal to cost without', () => {
    const profile = makeProfile(20);
    const result = simulateBatteryOperation(profile, baseBattery, baseTariffs);
    expect(result.totalCostWithBattery).toBeLessThanOrEqual(result.totalCostWithoutBattery);
  });

  it('total savings equals cost difference', () => {
    const profile = makeProfile(20);
    const result = simulateBatteryOperation(profile, baseBattery, baseTariffs);
    expect(result.totalSavings).toBeCloseTo(
      result.totalCostWithoutBattery - result.totalCostWithBattery,
      2
    );
  });

  it('state of charge stays within bounds', () => {
    const profile = makeProfile(20);
    const result = simulateBatteryOperation(profile, baseBattery, baseTariffs);
    for (const hr of result.hourlyResults) {
      expect(hr.stateOfCharge).toBeGreaterThanOrEqual(0);
      expect(hr.stateOfCharge).toBeLessThanOrEqual(baseBattery.capacityKwh * 1.01);
    }
  });

  it('handles zero consumption gracefully', () => {
    const profile = makeProfile(0);
    const result = simulateBatteryOperation(profile, baseBattery, baseTariffs);
    expect(result.totalCostWithoutBattery).toBeCloseTo(0);
    expect(result.hourlyResults).toHaveLength(8760);
  });

  it('handles very high consumption', () => {
    const profile = makeProfile(1000);
    const result = simulateBatteryOperation(profile, baseBattery, baseTariffs);
    expect(result.totalCostWithoutBattery).toBeGreaterThan(0);
    expect(result.hourlyResults).toHaveLength(8760);
  });

  it('reports positive total cycles', () => {
    const profile = makeProfile(20);
    const result = simulateBatteryOperation(profile, baseBattery, baseTariffs);
    expect(result.totalCycles).toBeGreaterThan(0);
  });

  // --- Peak/off-peak behavior ---

  it('charges only during off-peak hours (0-6, 23)', () => {
    const profile = makeProfile(20);
    const result = simulateBatteryOperation(profile, baseBattery, baseTariffs);
    for (const hr of result.hourlyResults) {
      const hourOfDay = hr.hour % 24;
      const isPeak = hourOfDay >= 7 && hourOfDay < 23;
      if (isPeak) {
        expect(hr.batteryCharge).toBe(0);
      }
    }
  });

  it('discharges only during peak hours (7-22)', () => {
    const profile = makeProfile(20);
    const result = simulateBatteryOperation(profile, baseBattery, baseTariffs);
    for (const hr of result.hourlyResults) {
      const hourOfDay = hr.hour % 24;
      const isPeak = hourOfDay >= 7 && hourOfDay < 23;
      if (!isPeak) {
        expect(hr.batteryDischarge).toBe(0);
      }
    }
  });

  // --- Charge/discharge limits ---

  it('never charges more than max power per hour', () => {
    const profile = makeProfile(20);
    const result = simulateBatteryOperation(profile, baseBattery, baseTariffs);
    for (const hr of result.hourlyResults) {
      expect(hr.batteryCharge).toBeLessThanOrEqual(baseBattery.powerKw + 0.01);
    }
  });

  it('never discharges more than max power per hour', () => {
    const profile = makeProfile(20);
    const result = simulateBatteryOperation(profile, baseBattery, baseTariffs);
    for (const hr of result.hourlyResults) {
      expect(hr.batteryDischarge).toBeLessThanOrEqual(baseBattery.powerKw + 0.01);
    }
  });

  it('discharge never exceeds consumption (no grid export)', () => {
    const profile = makeProfile(20);
    const result = simulateBatteryOperation(profile, baseBattery, baseTariffs);
    for (const hr of result.hourlyResults) {
      expect(hr.batteryDischarge).toBeLessThanOrEqual(hr.consumption + 0.01);
    }
  });

  // --- SoC respects depth of discharge ---

  it('SoC never drops below min SoC (capacity * (1 - DoD))', () => {
    const profile = makeProfile(20);
    const result = simulateBatteryOperation(profile, baseBattery, baseTariffs);
    const minSoC = baseBattery.capacityKwh * (1 - baseBattery.depthOfDischarge);
    for (const hr of result.hourlyResults) {
      expect(hr.stateOfCharge).toBeGreaterThanOrEqual(minSoC - 0.01);
    }
  });

  // --- Efficiency losses ---

  it('total discharged energy is less than total charged (efficiency losses)', () => {
    const profile = makeProfile(30);
    const result = simulateBatteryOperation(profile, baseBattery, baseTariffs);
    // Round-trip efficiency < 1 means we lose energy
    if (result.totalCharged > 0) {
      expect(result.totalDischarged).toBeLessThan(result.totalCharged);
    }
  });

  // --- Edge case: equal peak/off-peak rates ---

  it('no savings when peak rate equals off-peak rate', () => {
    const flatTariffs: TariffStructure = {
      ...baseTariffs,
      peakRate: 0.15,
      offPeakRate: 0.15,
    };
    const profile = makeProfile(20);
    const result = simulateBatteryOperation(profile, baseBattery, flatTariffs);
    // With flat pricing, battery should produce zero or negative savings
    // (negative due to efficiency losses of charging from grid at same price)
    expect(result.totalSavings).toBeLessThanOrEqual(0.01);
  });

  // --- Edge case: very small battery ---

  it('handles very small battery (1 kWh)', () => {
    const tinyBattery: BatteryConfig = {
      ...baseBattery,
      capacityKwh: 1,
      powerKw: 1,
    };
    const profile = makeProfile(100);
    const result = simulateBatteryOperation(profile, tinyBattery, baseTariffs);
    expect(result.hourlyResults).toHaveLength(8760);
    expect(isFinite(result.totalCostWithBattery)).toBe(true);
    // Tiny battery should still produce some savings
    expect(result.totalSavings).toBeGreaterThanOrEqual(0);
  });

  // --- Edge case: battery bigger than demand ---

  it('handles battery larger than hourly demand', () => {
    const bigBattery: BatteryConfig = {
      ...baseBattery,
      capacityKwh: 10000,
      powerKw: 5000,
    };
    const profile = makeProfile(10);
    const result = simulateBatteryOperation(profile, bigBattery, baseTariffs);
    expect(result.hourlyResults).toHaveLength(8760);
    expect(isFinite(result.totalSavings)).toBe(true);
  });

  // --- Edge case: 100% DoD ---

  it('handles 100% depth of discharge', () => {
    const fullDod: BatteryConfig = { ...baseBattery, depthOfDischarge: 1.0 };
    const profile = makeProfile(20);
    const result = simulateBatteryOperation(profile, fullDod, baseTariffs);
    expect(result.hourlyResults).toHaveLength(8760);
    // SoC can go to 0
    const minSoC = Math.min(...result.hourlyResults.map(h => h.stateOfCharge));
    expect(minSoC).toBeGreaterThanOrEqual(-0.01);
  });

  // --- Edge case: 50% DoD (conservative) ---

  it('50% DoD limits usable capacity', () => {
    const halfDod: BatteryConfig = { ...baseBattery, depthOfDischarge: 0.5 };
    const fullDod: BatteryConfig = { ...baseBattery, depthOfDischarge: 1.0 };
    const profile = makeProfile(20);
    const halfResult = simulateBatteryOperation(profile, halfDod, baseTariffs);
    const fullResult = simulateBatteryOperation(profile, fullDod, baseTariffs);
    // More usable capacity → more savings
    expect(fullResult.totalSavings).toBeGreaterThanOrEqual(halfResult.totalSavings);
  });

  // --- Peak reduction ---

  it('reports finite peak reduction', () => {
    const profile = makeProfile(20);
    const result = simulateBatteryOperation(profile, baseBattery, baseTariffs);
    // Peak reduction can be negative: battery charging during off-peak increases grid demand
    expect(isFinite(result.peakReduction)).toBe(true);
  });

  // --- Sparse profile ---

  it('handles profile with fewer than 8760 hours', () => {
    const shortProfile: EnergyProfile = {
      hourlyConsumptionKwh: new Array(100).fill(20),
      peakDemandKw: 30,
      annualConsumptionKwh: 2000,
      connectionCapacityKw: 40,
      sector: 'hospitality',
    };
    const result = simulateBatteryOperation(shortProfile, baseBattery, baseTariffs);
    expect(result.hourlyResults).toHaveLength(100);
    expect(isFinite(result.totalSavings)).toBe(true);
  });

  // --- Larger tariff spread means more savings ---

  it('wider peak/off-peak spread produces more savings', () => {
    const profile = makeProfile(30);
    const narrowSpread: TariffStructure = { ...baseTariffs, peakRate: 0.16, offPeakRate: 0.14 };
    const wideSpread: TariffStructure = { ...baseTariffs, peakRate: 0.35, offPeakRate: 0.10 };
    const narrowResult = simulateBatteryOperation(profile, baseBattery, narrowSpread);
    const wideResult = simulateBatteryOperation(profile, baseBattery, wideSpread);
    expect(wideResult.totalSavings).toBeGreaterThan(narrowResult.totalSavings);
  });

  // --- Higher efficiency means more savings ---

  it('higher round-trip efficiency produces more savings', () => {
    const profile = makeProfile(30);
    const lowEff: BatteryConfig = { ...baseBattery, roundTripEfficiency: 0.75 };
    const highEff: BatteryConfig = { ...baseBattery, roundTripEfficiency: 0.95 };
    const lowResult = simulateBatteryOperation(profile, lowEff, baseTariffs);
    const highResult = simulateBatteryOperation(profile, highEff, baseTariffs);
    expect(highResult.totalSavings).toBeGreaterThanOrEqual(lowResult.totalSavings);
  });
});

describe('getMonthlyBreakdown', () => {
  it('returns 12 months', () => {
    const profile = makeProfile(20);
    const sim = simulateBatteryOperation(profile, baseBattery, baseTariffs);
    const months = getMonthlyBreakdown(sim);
    expect(months).toHaveLength(12);
  });

  it('has correct month labels', () => {
    const profile = makeProfile(20);
    const sim = simulateBatteryOperation(profile, baseBattery, baseTariffs);
    const months = getMonthlyBreakdown(sim);
    expect(months[0].label).toBe('Januari');
    expect(months[5].label).toBe('Juni');
    expect(months[11].label).toBe('December');
  });

  it('monthly savings sum approximately equals annual savings', () => {
    const profile = makeProfile(20);
    const sim = simulateBatteryOperation(profile, baseBattery, baseTariffs);
    const months = getMonthlyBreakdown(sim);
    const totalMonthlySavings = months.reduce((sum, m) => sum + m.savings, 0);
    expect(totalMonthlySavings).toBeCloseTo(sim.totalSavings, 0);
  });

  it('month indices are 0 through 11', () => {
    const profile = makeProfile(20);
    const sim = simulateBatteryOperation(profile, baseBattery, baseTariffs);
    const months = getMonthlyBreakdown(sim);
    months.forEach((m, i) => expect(m.month).toBe(i));
  });

  it('monthly costWithout sums to annual costWithout', () => {
    const profile = makeProfile(20);
    const sim = simulateBatteryOperation(profile, baseBattery, baseTariffs);
    const months = getMonthlyBreakdown(sim);
    const totalCostWithout = months.reduce((sum, m) => sum + m.costWithout, 0);
    expect(totalCostWithout).toBeCloseTo(sim.totalCostWithoutBattery, 0);
  });

  it('monthly costWith sums to annual costWith', () => {
    const profile = makeProfile(20);
    const sim = simulateBatteryOperation(profile, baseBattery, baseTariffs);
    const months = getMonthlyBreakdown(sim);
    const totalCostWith = months.reduce((sum, m) => sum + m.costWith, 0);
    expect(totalCostWith).toBeCloseTo(sim.totalCostWithBattery, 0);
  });

  it('savings = costWithout - costWith for each month', () => {
    const profile = makeProfile(20);
    const sim = simulateBatteryOperation(profile, baseBattery, baseTariffs);
    const months = getMonthlyBreakdown(sim);
    for (const m of months) {
      expect(m.savings).toBeCloseTo(m.costWithout - m.costWith, 2);
    }
  });

  it('all monthly energy values are non-negative', () => {
    const profile = makeProfile(20);
    const sim = simulateBatteryOperation(profile, baseBattery, baseTariffs);
    const months = getMonthlyBreakdown(sim);
    for (const m of months) {
      expect(m.energyCharged).toBeGreaterThanOrEqual(0);
      expect(m.energyDischarged).toBeGreaterThanOrEqual(0);
      expect(m.cycles).toBeGreaterThanOrEqual(0);
    }
  });

  it('January (31 days) has more cost than February (28 days) for flat profile', () => {
    const profile = makeProfile(20);
    const sim = simulateBatteryOperation(profile, baseBattery, baseTariffs);
    const months = getMonthlyBreakdown(sim);
    expect(months[0].costWithout).toBeGreaterThan(months[1].costWithout);
  });
});

// ═══════════════════════════════════════════════════════════════
// DYNAMIC PRICING (EPEX) MODE
// ═══════════════════════════════════════════════════════════════

describe('simulateBatteryOperation — dynamic pricing', () => {
  const dynamicTariffs: TariffStructure = {
    ...baseTariffs,
    pricingMode: 'dynamic',
    hourlyPrices: EPEX_TYPICAL_PROFILE,
  };

  it('produces 8760 hourly results with dynamic tariffs', () => {
    const profile = makeProfile(20);
    const result = simulateBatteryOperation(profile, baseBattery, dynamicTariffs);
    expect(result.hourlyResults).toHaveLength(8760);
  });

  it('generates positive savings with EPEX spread', () => {
    const profile = makeProfile(25);
    const result = simulateBatteryOperation(profile, baseBattery, dynamicTariffs);
    expect(result.totalSavings).toBeGreaterThan(0);
  });

  it('charges during cheap hours (below mean price)', () => {
    const profile = makeProfile(20);
    const result = simulateBatteryOperation(profile, baseBattery, dynamicTariffs);
    const mean = EPEX_TYPICAL_PROFILE.reduce((s, v) => s + v, 0) / 24;
    for (const hr of result.hourlyResults) {
      const hourOfDay = hr.hour % 24;
      const price = EPEX_TYPICAL_PROFILE[hourOfDay];
      if (price >= mean) {
        // Should not charge during expensive hours
        expect(hr.batteryCharge).toBe(0);
      }
    }
  });

  it('discharges during expensive hours (above mean price)', () => {
    const profile = makeProfile(20);
    const result = simulateBatteryOperation(profile, baseBattery, dynamicTariffs);
    const mean = EPEX_TYPICAL_PROFILE.reduce((s, v) => s + v, 0) / 24;
    for (const hr of result.hourlyResults) {
      const hourOfDay = hr.hour % 24;
      const price = EPEX_TYPICAL_PROFILE[hourOfDay];
      if (price < mean) {
        // Should not discharge during cheap hours
        expect(hr.batteryDischarge).toBe(0);
      }
    }
  });

  it('dynamic mode produces more savings than flat fixed pricing', () => {
    const profile = makeProfile(25);
    const flatTariffs: TariffStructure = {
      ...baseTariffs,
      pricingMode: 'fixed',
      peakRate: 0.11,
      offPeakRate: 0.10,
    };
    const dynamicResult = simulateBatteryOperation(profile, baseBattery, dynamicTariffs);
    const flatResult = simulateBatteryOperation(profile, baseBattery, flatTariffs);
    expect(dynamicResult.totalSavings).toBeGreaterThan(flatResult.totalSavings);
  });
});
