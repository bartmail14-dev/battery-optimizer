import Decimal from 'decimal.js';
import type { HourlySimulationResult, OperatingRegime, OperatingRegimeBreakdown } from '../../types';

/**
 * Classifies each hour into an operating regime and aggregates hours + revenue per regime.
 *
 * Regimes:
 * - arbitrage_charge: battery is charging outside peak hours
 * - arbitrage_discharge: battery is discharging outside peak hours
 * - peak_shaving: battery is discharging during peak hours
 * - idle: no battery action
 *
 * @param hourlyResults - 8760 hourly simulation results
 * @param peakHoursStart - Start of peak hours (inclusive), e.g. 7
 * @param peakHoursEnd - End of peak hours (exclusive), e.g. 23
 * @returns Aggregated operating regime breakdown
 */
export function aggregateRegimeBreakdown(
  hourlyResults: HourlySimulationResult[],
  peakHoursStart: number,
  peakHoursEnd: number
): OperatingRegimeBreakdown {
  const hours: Record<OperatingRegime, number> = {
    arbitrage_charge: 0,
    arbitrage_discharge: 0,
    peak_shaving: 0,
    idle: 0,
  };

  const revenue: Record<OperatingRegime, number> = {
    arbitrage_charge: 0,
    arbitrage_discharge: 0,
    peak_shaving: 0,
    idle: 0,
  };

  for (const hr of hourlyResults) {
    const hourOfDay = hr.hour % 24;
    const isPeak = hourOfDay >= peakHoursStart && hourOfDay < peakHoursEnd;
    const saving = new Decimal(hr.costWithoutBattery).minus(new Decimal(hr.costWithBattery));

    let regime: OperatingRegime;

    if (hr.batteryCharge > 0) {
      regime = 'arbitrage_charge';
    } else if (hr.batteryDischarge > 0) {
      regime = isPeak ? 'peak_shaving' : 'arbitrage_discharge';
    } else {
      regime = 'idle';
    }

    hours[regime]++;
    revenue[regime] = new Decimal(revenue[regime]).plus(saving).toNumber();
  }

  return { hours, revenue };
}
