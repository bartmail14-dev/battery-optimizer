import { describe, it, expect } from 'vitest';
import { aggregateRegimeBreakdown } from './regime-analyzer';
import { simulateBatteryOperation } from './battery-simulation';
import type { BatteryConfig, EnergyProfile, TariffStructure } from '../../types';

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

describe('aggregateRegimeBreakdown', () => {
  it('total hours across all regimes equals 8760', () => {
    const simulation = simulateBatteryOperation(profile, battery, tariffs);
    const regime = aggregateRegimeBreakdown(simulation.hourlyResults, 7, 23);
    const totalHours = regime.hours.arbitrage_charge +
      regime.hours.arbitrage_discharge +
      regime.hours.peak_shaving +
      regime.hours.idle;
    expect(totalHours).toBe(8760);
  });

  it('no regime has negative hours', () => {
    const simulation = simulateBatteryOperation(profile, battery, tariffs);
    const regime = aggregateRegimeBreakdown(simulation.hourlyResults, 7, 23);
    expect(regime.hours.arbitrage_charge).toBeGreaterThanOrEqual(0);
    expect(regime.hours.arbitrage_discharge).toBeGreaterThanOrEqual(0);
    expect(regime.hours.peak_shaving).toBeGreaterThanOrEqual(0);
    expect(regime.hours.idle).toBeGreaterThanOrEqual(0);
  });

  it('charging hours are non-zero for standard scenario', () => {
    const simulation = simulateBatteryOperation(profile, battery, tariffs);
    const regime = aggregateRegimeBreakdown(simulation.hourlyResults, 7, 23);
    expect(regime.hours.arbitrage_charge).toBeGreaterThan(0);
  });

  it('peak shaving hours are non-zero for standard scenario', () => {
    const simulation = simulateBatteryOperation(profile, battery, tariffs);
    const regime = aggregateRegimeBreakdown(simulation.hourlyResults, 7, 23);
    expect(regime.hours.peak_shaving).toBeGreaterThan(0);
  });

  it('peak shaving revenue is non-negative', () => {
    const simulation = simulateBatteryOperation(profile, battery, tariffs);
    const regime = aggregateRegimeBreakdown(simulation.hourlyResults, 7, 23);
    expect(regime.revenue.peak_shaving).toBeGreaterThanOrEqual(0);
  });

  it('returns valid result for zero consumption', () => {
    const zeroProfile: EnergyProfile = {
      hourlyConsumptionKwh: new Array(8760).fill(0),
      peakDemandKw: 0,
      annualConsumptionKwh: 0,
      connectionCapacityKw: 0,
      sector: 'hospitality',
    };
    const simulation = simulateBatteryOperation(zeroProfile, battery, tariffs);
    const regime = aggregateRegimeBreakdown(simulation.hourlyResults, 7, 23);
    const totalHours = regime.hours.arbitrage_charge +
      regime.hours.arbitrage_discharge +
      regime.hours.peak_shaving +
      regime.hours.idle;
    expect(totalHours).toBe(8760);
  });
});
