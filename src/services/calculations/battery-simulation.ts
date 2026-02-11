import Decimal from 'decimal.js';
import type { BatteryConfig, EnergyProfile, TariffStructure, HourlySimulationResult, AnnualSimulationResult, MonthlyBreakdown } from '../../types';
import { PEAK_HOURS, HOURS_PER_MONTH, MONTH_NAMES } from '../../constants';

/**
 * Determines whether a given hour is a peak hour.
 * Peak hours: 07:00 - 23:00 CET (market convention NL)
 */
function isPeakHour(hourOfDay: number): boolean {
  return hourOfDay >= PEAK_HOURS.start && hourOfDay < PEAK_HOURS.end;
}

/**
 * Gets the electricity rate for a given hour based on tariff structure.
 * In dynamic mode: uses 24-hour EPEX price profile.
 * In fixed mode: binary peak/off-peak rates.
 */
function getHourlyRate(hourOfDay: number, tariffs: TariffStructure): Decimal {
  if (tariffs.pricingMode === 'dynamic' && tariffs.hourlyPrices) {
    return new Decimal(tariffs.hourlyPrices[hourOfDay] ?? 0.10);
  }
  return isPeakHour(hourOfDay)
    ? new Decimal(tariffs.peakRate)
    : new Decimal(tariffs.offPeakRate);
}

/**
 * Determines charge/discharge decision for a given hour.
 * In dynamic mode: compare hourly price against daily threshold.
 * In fixed mode: charge off-peak, discharge on-peak.
 */
function shouldCharge(hourOfDay: number, tariffs: TariffStructure): boolean {
  if (tariffs.pricingMode === 'dynamic' && tariffs.hourlyPrices) {
    // Charge when price is below the daily mean (cheap hours)
    const mean = tariffs.hourlyPrices.reduce((s, v) => s + v, 0) / 24;
    return tariffs.hourlyPrices[hourOfDay] < mean;
  }
  return !isPeakHour(hourOfDay);
}

function shouldDischarge(hourOfDay: number, tariffs: TariffStructure): boolean {
  if (tariffs.pricingMode === 'dynamic' && tariffs.hourlyPrices) {
    // Discharge when price is above the daily mean (expensive hours)
    const mean = tariffs.hourlyPrices.reduce((s, v) => s + v, 0) / 24;
    return tariffs.hourlyPrices[hourOfDay] >= mean;
  }
  return isPeakHour(hourOfDay);
}

/**
 * Simulates hour-by-hour battery operation over a full year (8760 hours).
 *
 * Strategy: charge during low-price (off-peak) hours, discharge during high-price (peak) hours.
 * Respects C-rate, depth of discharge, and round-trip efficiency losses.
 *
 * All internal calculations use Decimal.js for financial precision.
 */
export function simulateBatteryOperation(
  profile: EnergyProfile,
  battery: BatteryConfig,
  tariffs: TariffStructure
): AnnualSimulationResult {
  const capacity = new Decimal(battery.capacityKwh);
  const maxPower = new Decimal(battery.powerKw);
  const efficiency = new Decimal(battery.roundTripEfficiency);
  const sqrtEfficiency = efficiency.sqrt(); // Split efficiency between charge/discharge
  const dod = new Decimal(battery.depthOfDischarge);
  const usableCapacity = capacity.mul(dod);
  const minSoC = capacity.mul(new Decimal(1).minus(dod));

  let stateOfCharge = new Decimal(capacity.mul(0.5)); // Start at 50% SoC
  const hourlyResults: HourlySimulationResult[] = [];

  let totalCostWith = new Decimal(0);
  let totalCostWithout = new Decimal(0);
  let totalCharged = new Decimal(0);
  let totalDischarged = new Decimal(0);
  let peakWithBattery = new Decimal(0);
  let peakWithoutBattery = new Decimal(0);

  for (let hour = 0; hour < profile.hourlyConsumptionKwh.length; hour++) {
    const hourOfDay = hour % 24;
    const consumption = new Decimal(profile.hourlyConsumptionKwh[hour] ?? 0);
    const rate = getHourlyRate(hourOfDay, tariffs);

    // Cost without battery (baseline)
    const costWithout = consumption.mul(rate);
    totalCostWithout = totalCostWithout.plus(costWithout);

    if (consumption.gt(peakWithoutBattery)) {
      peakWithoutBattery = consumption;
    }

    let batteryCharge = new Decimal(0);
    let batteryDischarge = new Decimal(0);

    if (shouldCharge(hourOfDay, tariffs)) {
      // Low-price hour: charge the battery
      const roomToCharge = capacity.minus(stateOfCharge);
      const maxChargeThisHour = Decimal.min(maxPower, roomToCharge);
      // Account for charge efficiency — energy from grid is higher than stored
      const chargeFromGrid = maxChargeThisHour.div(sqrtEfficiency);
      batteryCharge = Decimal.min(maxChargeThisHour, chargeFromGrid.mul(sqrtEfficiency));

      if (batteryCharge.gt(0)) {
        stateOfCharge = stateOfCharge.plus(batteryCharge);
        totalCharged = totalCharged.plus(chargeFromGrid);
      }
    } else if (shouldDischarge(hourOfDay, tariffs)) {
      // High-price hour: discharge the battery to offset consumption
      const availableEnergy = stateOfCharge.minus(minSoC);
      const maxDischargeThisHour = Decimal.min(maxPower, availableEnergy);
      // To deliver `consumption` kWh, we need to drain consumption/√η from SoC
      const neededDrain = consumption.div(sqrtEfficiency);
      batteryDischarge = Decimal.min(maxDischargeThisHour, neededDrain);
      // Useful energy delivered to building after discharge efficiency
      const usefulEnergy = batteryDischarge.mul(sqrtEfficiency);

      if (batteryDischarge.gt(0)) {
        stateOfCharge = stateOfCharge.minus(batteryDischarge);
        totalDischarged = totalDischarged.plus(usefulEnergy);
      }

      batteryDischarge = usefulEnergy; // Report the useful energy delivered
    }

    // Grid import with battery = consumption - battery discharge + battery charge from grid
    const gridImportWithBattery = consumption.minus(batteryDischarge).plus(
      batteryCharge.gt(0) ? batteryCharge.div(sqrtEfficiency) : new Decimal(0)
    );
    const costWith = Decimal.max(gridImportWithBattery, new Decimal(0)).mul(rate);
    totalCostWith = totalCostWith.plus(costWith);

    const effectiveGridDemand = gridImportWithBattery.gt(0) ? gridImportWithBattery : new Decimal(0);
    if (effectiveGridDemand.gt(peakWithBattery)) {
      peakWithBattery = effectiveGridDemand;
    }

    hourlyResults.push({
      hour,
      consumption: consumption.toNumber(),
      batteryCharge: batteryCharge.toNumber(),
      batteryDischarge: batteryDischarge.toNumber(),
      stateOfCharge: stateOfCharge.toNumber(),
      gridImport: gridImportWithBattery.toNumber(),
      costWithBattery: costWith.toNumber(),
      costWithoutBattery: costWithout.toNumber(),
    });
  }

  // Calculate total cycles
  const totalCycleEnergy = totalCharged.plus(totalDischarged).div(2);
  const totalCycles = usableCapacity.gt(0)
    ? totalCycleEnergy.div(usableCapacity).toNumber()
    : 0;

  return {
    hourlyResults,
    totalCostWithBattery: totalCostWith.toNumber(),
    totalCostWithoutBattery: totalCostWithout.toNumber(),
    totalSavings: totalCostWithout.minus(totalCostWith).toNumber(),
    totalCharged: totalCharged.toNumber(),
    totalDischarged: totalDischarged.toNumber(),
    totalCycles,
    peakReduction: peakWithoutBattery.minus(peakWithBattery).toNumber(),
  };
}

/**
 * Aggregates hourly simulation results into monthly breakdown.
 */
export function getMonthlyBreakdown(simulation: AnnualSimulationResult, battery: BatteryConfig): MonthlyBreakdown[] {
  const usableCapacity = new Decimal(battery.capacityKwh).mul(battery.depthOfDischarge);
  const months: MonthlyBreakdown[] = [];
  let hourOffset = 0;

  for (let m = 0; m < 12; m++) {
    const hoursInMonth = HOURS_PER_MONTH[m];
    let costWithout = new Decimal(0);
    let costWith = new Decimal(0);
    let energyCharged = new Decimal(0);
    let energyDischarged = new Decimal(0);

    for (let h = 0; h < hoursInMonth; h++) {
      const result = simulation.hourlyResults[hourOffset + h];
      if (!result) break;
      costWithout = costWithout.plus(new Decimal(result.costWithoutBattery));
      costWith = costWith.plus(new Decimal(result.costWithBattery));
      energyCharged = energyCharged.plus(new Decimal(result.batteryCharge));
      energyDischarged = energyDischarged.plus(new Decimal(result.batteryDischarge));
    }

    const savings = costWithout.minus(costWith);
    const cycleEnergy = energyCharged.plus(energyDischarged).div(2);

    months.push({
      month: m,
      label: MONTH_NAMES[m],
      costWithout: costWithout.toNumber(),
      costWith: costWith.toNumber(),
      savings: savings.toNumber(),
      energyCharged: energyCharged.toNumber(),
      energyDischarged: energyDischarged.toNumber(),
      cycles: usableCapacity.gt(0) ? cycleEnergy.div(usableCapacity).toNumber() : 0,
    });

    hourOffset += hoursInMonth;
  }

  return months;
}
