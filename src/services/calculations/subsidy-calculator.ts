import Decimal from 'decimal.js';
import type { BatteryConfig, SubsidyConfig, SubsidyScheduleEntry } from '../../types';
import {
  SDE_BASE_AMOUNT,
  SDE_CORRECTION_AMOUNT,
  SDE_MIN_FULL_LOAD_HOURS,
  SDE_DURATION_YEARS,
  EIA_PERCENTAGE,
  EIA_MIN_INVESTMENT,
  EIA_MAX_DEDUCTION,
  CORPORATE_TAX_RATE,
} from '../../constants';

/**
 * Calculates annual SDE++ subsidy for battery storage.
 *
 * SDE++ subsidizes the difference between the base amount and the correction amount
 * (approximation of market revenue) per kWh discharged.
 *
 * Conditions:
 * - Must meet minimum full load hours
 * - Subsidy = (base amount - correction amount) * eligible kWh
 *
 * @param battery - Battery configuration
 * @param subsidyConfig - Subsidy eligibility configuration
 * @param annualDischargeKwh - Annual energy discharged in kWh
 * @returns Annual SDE++ subsidy in EUR
 *
 * Bron: RVO, SDE++ voorjaar 2024
 */
export function calculateSDE(
  battery: BatteryConfig,
  subsidyConfig: SubsidyConfig,
  annualDischargeKwh: number
): number {
  if (!subsidyConfig.sdeEligible) return 0;
  if (annualDischargeKwh <= 0) return 0;

  const baseAmount = new Decimal(subsidyConfig.sdeBaseAmount ?? SDE_BASE_AMOUNT);
  const correctionAmount = new Decimal(SDE_CORRECTION_AMOUNT);

  // SDE++ pays the difference between base and correction
  const subsidyPerKwh = Decimal.max(baseAmount.minus(correctionAmount), new Decimal(0));

  // Check minimum full load hours requirement
  const fullLoadHours = battery.capacityKwh > 0
    ? annualDischargeKwh / battery.capacityKwh
    : 0;

  if (fullLoadHours < SDE_MIN_FULL_LOAD_HOURS) {
    // Below minimum — subsidy is proportionally reduced
    const reductionFactor = new Decimal(fullLoadHours).div(new Decimal(SDE_MIN_FULL_LOAD_HOURS));
    return subsidyPerKwh
      .mul(new Decimal(annualDischargeKwh))
      .mul(reductionFactor)
      .toNumber();
  }

  return subsidyPerKwh.mul(new Decimal(annualDischargeKwh)).toNumber();
}

/**
 * Calculates EIA (Energie Investeringsaftrek) tax benefit.
 *
 * EIA allows deducting a percentage of the eligible investment from taxable profit.
 * The actual cash benefit depends on the corporate tax rate.
 *
 * This is a ONE-TIME benefit in the year of investment (not annual).
 *
 * @param totalInvestment - Total eligible investment in EUR
 * @param subsidyConfig - Subsidy configuration with EIA parameters
 * @returns One-time EIA cash benefit in EUR
 *
 * Bron: RVO, Energielijst 2024
 */
export function calculateEIA(
  totalInvestment: number,
  subsidyConfig: SubsidyConfig
): number {
  if (totalInvestment < EIA_MIN_INVESTMENT) return 0;

  const investment = new Decimal(totalInvestment);
  const percentage = new Decimal(subsidyConfig.eiaPercentage ?? EIA_PERCENTAGE);
  const maxDeduction = new Decimal(subsidyConfig.eiaMaxDeduction ?? EIA_MAX_DEDUCTION);
  const taxRate = new Decimal(CORPORATE_TAX_RATE);

  // Calculate deduction (capped at max)
  const deduction = Decimal.min(investment.mul(percentage), maxDeduction);

  // The actual cash benefit is the deduction * corporate tax rate
  return deduction.mul(taxRate).toNumber();
}

/**
 * Calculates total annual subsidy income (SDE++ annualized + EIA amortized over lifespan).
 *
 * Note: EIA is technically a one-time benefit, but for cashflow modeling
 * it can be spread over the first year or applied as a reduction to investment.
 * This function returns the annual SDE++ amount only; EIA should be applied
 * separately to the initial investment.
 */
export function calculateTotalSubsidyPerYear(
  battery: BatteryConfig,
  subsidyConfig: SubsidyConfig,
  annualDischargeKwh: number
): number {
  const annualSDE = calculateSDE(battery, subsidyConfig, annualDischargeKwh);
  return annualSDE;
}

/**
 * Calculates the effective investment after EIA deduction.
 * Use this to reduce the initial cashflow (year 0) in NPV calculations.
 */
export function getEffectiveInvestment(
  totalInvestment: number,
  subsidyConfig: SubsidyConfig
): number {
  const eiaBenefit = calculateEIA(totalInvestment, subsidyConfig);
  return Math.max(0, totalInvestment - eiaBenefit);
}

/**
 * Generates a year-by-year subsidy schedule over the project lifetime.
 *
 * - SDE++ runs for SDE_DURATION_YEARS (15), then sdeAmount = 0
 * - EIA is a one-time benefit in year 0
 * - Degradation reduces discharge volume per year → lower SDE++ amount
 *
 * @param battery - Battery configuration
 * @param subsidyConfig - Subsidy configuration
 * @param annualDischargeKwh - First-year annual discharge in kWh
 * @param grossInvestment - Gross investment for EIA calculation
 * @param years - Total analysis horizon
 * @returns Array of SubsidyScheduleEntry
 */
export function generateSubsidySchedule(
  battery: BatteryConfig,
  subsidyConfig: SubsidyConfig,
  annualDischargeKwh: number,
  grossInvestment: number,
  years: number
): SubsidyScheduleEntry[] {
  const schedule: SubsidyScheduleEntry[] = [];
  const eiaAmount = calculateEIA(grossInvestment, subsidyConfig);

  for (let year = 0; year <= years; year++) {
    if (year === 0) {
      schedule.push({
        year: 0,
        sdeAmount: 0,
        eiaAmount,
        totalSubsidy: eiaAmount,
        isSdeActive: false,
      });
      continue;
    }

    const isSdeActive = year <= SDE_DURATION_YEARS && subsidyConfig.sdeEligible;
    let sdeAmount = 0;

    if (isSdeActive) {
      // Degradation reduces discharge volume each year
      const degradationFactor = new Decimal(1)
        .minus(new Decimal(battery.annualDegradation))
        .pow(year - 1);
      const degradedDischarge = new Decimal(annualDischargeKwh).mul(degradationFactor).toNumber();
      sdeAmount = calculateSDE(battery, subsidyConfig, degradedDischarge);
    }

    schedule.push({
      year,
      sdeAmount,
      eiaAmount: 0,
      totalSubsidy: sdeAmount,
      isSdeActive,
    });
  }

  return schedule;
}
