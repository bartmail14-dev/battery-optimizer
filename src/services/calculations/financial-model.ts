import Decimal from 'decimal.js';
import type { YearlyRevenueBreakdown, SubsidyScheduleEntry } from '../../types';

/**
 * Calculates Net Present Value (NPV) of a series of cashflows.
 *
 * @param cashflows - Array of annual cashflows (index 0 = year 0, typically negative = investment)
 * @param discountRate - Annual discount rate as decimal (e.g., 0.06 for 6%)
 * @returns NPV in EUR
 */
export function calculateNPV(cashflows: number[], discountRate: number): number {
  if (cashflows.length === 0) return 0;

  const rate = new Decimal(discountRate);
  let npv = new Decimal(0);

  for (let t = 0; t < cashflows.length; t++) {
    const cf = new Decimal(cashflows[t]);
    const discountFactor = new Decimal(1).plus(rate).pow(t);

    // Guard against division by zero (rate = -1 would cause issues)
    if (discountFactor.isZero()) continue;

    npv = npv.plus(cf.div(discountFactor));
  }

  return npv.toNumber();
}

/**
 * Calculates Internal Rate of Return (IRR) using the Newton-Raphson method.
 *
 * @param cashflows - Array of annual cashflows (index 0 = initial investment, should be negative)
 * @param tolerance - Convergence tolerance (default: 1e-7)
 * @param maxIterations - Maximum iterations (default: 100)
 * @returns IRR as decimal, or NaN if no convergence
 */
export function calculateIRR(
  cashflows: number[],
  tolerance: number = 1e-7,
  maxIterations: number = 100
): number {
  if (cashflows.length < 2) return NaN;

  // Need at least one sign change for valid IRR
  const hasPositive = cashflows.some(cf => cf > 0);
  const hasNegative = cashflows.some(cf => cf < 0);
  if (!hasPositive || !hasNegative) return NaN;

  let guess = new Decimal(0.1); // Start with 10% guess

  for (let i = 0; i < maxIterations; i++) {
    let npv = new Decimal(0);
    let derivative = new Decimal(0);

    for (let t = 0; t < cashflows.length; t++) {
      const cf = new Decimal(cashflows[t]);
      const onePlusRate = new Decimal(1).plus(guess);

      if (onePlusRate.isZero() || onePlusRate.isNeg()) {
        // Avoid invalid exponentiation
        guess = guess.plus(0.01);
        break;
      }

      const discountFactor = onePlusRate.pow(t);
      if (discountFactor.isZero()) continue;

      npv = npv.plus(cf.div(discountFactor));

      if (t > 0) {
        derivative = derivative.minus(cf.mul(t).div(onePlusRate.pow(t + 1)));
      }
    }

    if (derivative.isZero()) {
      // Can't continue Newton-Raphson, try perturbing
      guess = guess.plus(0.01);
      continue;
    }

    const step = npv.div(derivative);
    guess = guess.minus(step);

    if (step.abs().lt(tolerance)) {
      return guess.toNumber();
    }
  }

  return NaN; // No convergence
}

/**
 * Calculates simple payback period.
 *
 * @param cashflows - Array of annual cashflows (index 0 = initial investment, negative)
 * @returns Payback period in years, or Infinity if never pays back
 */
export function calculateSimplePayback(cashflows: number[]): number {
  if (cashflows.length === 0) return Infinity;

  let cumulative = new Decimal(0);

  for (let t = 0; t < cashflows.length; t++) {
    const prevCumulative = cumulative;
    cumulative = cumulative.plus(new Decimal(cashflows[t]));

    if (cumulative.gte(0) && prevCumulative.lt(0)) {
      // Linear interpolation within the year
      const yearFraction = prevCumulative.abs().div(new Decimal(cashflows[t]));
      return new Decimal(t - 1).plus(yearFraction).toNumber();
    }

    if (t === 0 && cumulative.gte(0)) {
      return 0;
    }
  }

  return Infinity;
}

/**
 * Calculates discounted payback period.
 *
 * @param cashflows - Array of annual cashflows (index 0 = initial investment, negative)
 * @param discountRate - Annual discount rate as decimal
 * @returns Discounted payback period in years, or Infinity if never pays back
 */
export function calculateDiscountedPayback(cashflows: number[], discountRate: number): number {
  if (cashflows.length === 0) return Infinity;

  const rate = new Decimal(discountRate);
  let cumulative = new Decimal(0);

  for (let t = 0; t < cashflows.length; t++) {
    const discountFactor = new Decimal(1).plus(rate).pow(t);
    if (discountFactor.isZero()) continue;

    const discountedCf = new Decimal(cashflows[t]).div(discountFactor);
    const prevCumulative = cumulative;
    cumulative = cumulative.plus(discountedCf);

    if (cumulative.gte(0) && prevCumulative.lt(0)) {
      const yearFraction = prevCumulative.abs().div(discountedCf);
      return new Decimal(t - 1).plus(yearFraction).toNumber();
    }

    if (t === 0 && cumulative.gte(0)) {
      return 0;
    }
  }

  return Infinity;
}

/**
 * Calculates Levelized Cost of Storage (LCOS).
 *
 * LCOS = Total lifetime cost / Total lifetime energy discharged
 *
 * @param totalInvestment - Total upfront investment in EUR
 * @param annualMaintenanceCost - Annual O&M cost in EUR
 * @param annualDischargeKwh - Annual energy discharged in kWh
 * @param lifespanYears - System lifespan in years
 * @param discountRate - Discount rate as decimal
 * @param annualDegradation - Annual degradation rate as decimal
 * @returns LCOS in EUR/kWh, or Infinity if no discharge
 */
export function calculateLCOS(
  totalInvestment: number,
  annualMaintenanceCost: number,
  annualDischargeKwh: number,
  lifespanYears: number,
  discountRate: number,
  annualDegradation: number
): number {
  if (annualDischargeKwh <= 0 || lifespanYears <= 0) return Infinity;

  const rate = new Decimal(discountRate);
  const degradation = new Decimal(annualDegradation);
  const maintenance = new Decimal(annualMaintenanceCost);
  const baseDischarge = new Decimal(annualDischargeKwh);

  let totalDiscountedCost = new Decimal(totalInvestment);
  let totalDiscountedEnergy = new Decimal(0);

  for (let t = 1; t <= lifespanYears; t++) {
    const discountFactor = new Decimal(1).plus(rate).pow(t);
    if (discountFactor.isZero()) continue;

    // Maintenance cost discounted
    totalDiscountedCost = totalDiscountedCost.plus(maintenance.div(discountFactor));

    // Energy output decreases with degradation each year
    const yearlyDischarge = baseDischarge.mul(
      new Decimal(1).minus(degradation).pow(t - 1)
    );
    totalDiscountedEnergy = totalDiscountedEnergy.plus(yearlyDischarge.div(discountFactor));
  }

  if (totalDiscountedEnergy.isZero()) return Infinity;

  return totalDiscountedCost.div(totalDiscountedEnergy).toNumber();
}

/**
 * Generates a per-year breakdown with individual financial components.
 *
 * Uses the same logic as generateCashflows but returns each component separately.
 *
 * @param totalInvestment - Upfront investment (positive number, will be negated for year 0)
 * @param annualSavingsYear1 - First year savings in EUR
 * @param annualMaintenanceCost - Annual O&M cost in EUR
 * @param years - Analysis horizon
 * @param electricityPriceGrowth - Annual electricity price growth rate
 * @param annualDegradation - Annual battery degradation rate
 * @param subsidyPerYear - Annual subsidy income in EUR (default 0)
 * @returns Array of YearlyBreakdown objects (index 0 = year 0 = investment)
 */
export function generateYearlyBreakdown(
  totalInvestment: number,
  annualSavingsYear1: number,
  annualMaintenanceCost: number,
  years: number,
  electricityPriceGrowth: number,
  annualDegradation: number,
  subsidyPerYear: number = 0,
  discountRate: number = 0,
  subsidySchedule?: SubsidyScheduleEntry[]
): import('../../types').YearlyBreakdown[] {
  const breakdown: import('../../types').YearlyBreakdown[] = [];
  const rate = new Decimal(discountRate);

  // Year 0: investment
  const netCashflowYear0 = -totalInvestment;
  const discountedCashflow0 = netCashflowYear0; // discount factor = 1 at year 0
  breakdown.push({
    year: 0,
    grossSavings: 0,
    maintenance: 0,
    subsidy: 0,
    netCashflow: netCashflowYear0,
    cumulativeCashflow: netCashflowYear0,
    degradationFactor: 1,
    discountFactor: 1,
    discountedCashflow: discountedCashflow0,
    cumulativeDiscountedCashflow: discountedCashflow0,
  });

  let cumulativeCashflow = new Decimal(netCashflowYear0);
  let cumulativeDiscountedCashflow = new Decimal(discountedCashflow0);

  for (let t = 1; t <= years; t++) {
    const priceMultiplier = new Decimal(1).plus(new Decimal(electricityPriceGrowth)).pow(t - 1);
    const degradationMultiplier = new Decimal(1).minus(new Decimal(annualDegradation)).pow(t - 1);
    const yearSavings = new Decimal(annualSavingsYear1).mul(priceMultiplier).mul(degradationMultiplier);
    const yearMaintenance = new Decimal(annualMaintenanceCost);

    // Use subsidy schedule if available (respects SDE++ 15-year limit), else fall back to flat amount
    let yearSubsidyAmount: number;
    if (subsidySchedule) {
      const entry = subsidySchedule.find(s => s.year === t);
      yearSubsidyAmount = entry ? entry.sdeAmount : 0;
    } else {
      yearSubsidyAmount = subsidyPerYear;
    }
    const yearSubsidy = new Decimal(yearSubsidyAmount);

    const netCashflow = yearSavings.minus(yearMaintenance).plus(yearSubsidy);
    cumulativeCashflow = cumulativeCashflow.plus(netCashflow);

    const discountFactor = new Decimal(1).div(new Decimal(1).plus(rate).pow(t));
    const discountedCf = netCashflow.mul(discountFactor);
    cumulativeDiscountedCashflow = cumulativeDiscountedCashflow.plus(discountedCf);

    breakdown.push({
      year: t,
      grossSavings: yearSavings.toNumber(),
      maintenance: yearMaintenance.toNumber(),
      subsidy: yearSubsidy.toNumber(),
      netCashflow: netCashflow.toNumber(),
      cumulativeCashflow: cumulativeCashflow.toNumber(),
      degradationFactor: degradationMultiplier.toNumber(),
      discountFactor: discountFactor.toNumber(),
      discountedCashflow: discountedCf.toNumber(),
      cumulativeDiscountedCashflow: cumulativeDiscountedCashflow.toNumber(),
    });
  }

  return breakdown;
}

/**
 * Generates annual cashflows for a battery investment.
 *
 * @param totalInvestment - Upfront investment (positive number, will be negated)
 * @param annualSavingsYear1 - First year savings in EUR
 * @param annualMaintenanceCost - Annual O&M cost in EUR
 * @param years - Analysis horizon
 * @param electricityPriceGrowth - Annual electricity price growth rate
 * @param annualDegradation - Annual battery degradation rate
 * @param subsidyPerYear - Annual subsidy income in EUR (default 0)
 * @returns Array of annual cashflows
 */
export function generateCashflows(
  totalInvestment: number,
  annualSavingsYear1: number,
  annualMaintenanceCost: number,
  years: number,
  electricityPriceGrowth: number,
  annualDegradation: number,
  subsidyPerYear: number = 0,
  subsidySchedule?: SubsidyScheduleEntry[]
): number[] {
  const cashflows: number[] = [-totalInvestment]; // Year 0: investment

  for (let t = 1; t <= years; t++) {
    // Savings grow with electricity prices but shrink with degradation
    const priceMultiplier = new Decimal(1).plus(new Decimal(electricityPriceGrowth)).pow(t - 1);
    const degradationMultiplier = new Decimal(1).minus(new Decimal(annualDegradation)).pow(t - 1);
    const yearSavings = new Decimal(annualSavingsYear1).mul(priceMultiplier).mul(degradationMultiplier);
    const yearMaintenance = new Decimal(annualMaintenanceCost);

    // Use subsidy schedule if available (respects SDE++ 15-year limit), else fall back to flat amount
    let yearSubsidyAmount: number;
    if (subsidySchedule) {
      const entry = subsidySchedule.find(s => s.year === t);
      yearSubsidyAmount = entry ? entry.sdeAmount : 0;
    } else {
      yearSubsidyAmount = subsidyPerYear;
    }
    const yearSubsidy = new Decimal(yearSubsidyAmount);

    const netCashflow = yearSavings.minus(yearMaintenance).plus(yearSubsidy);
    cashflows.push(netCashflow.toNumber());
  }

  return cashflows;
}

/**
 * Generates a per-year revenue breakdown with arbitrage, peak shaving, subsidy, and maintenance.
 *
 * @param arbitrageSavingsYear1 - First year arbitrage savings in EUR
 * @param peakShavingSavingsYear1 - First year peak shaving savings in EUR
 * @param annualMaintenanceCost - Annual O&M cost in EUR
 * @param subsidySchedule - Subsidy schedule entries from generateSubsidySchedule
 * @param years - Analysis horizon
 * @param electricityPriceGrowth - Annual electricity price growth rate
 * @param annualDegradation - Annual battery degradation rate
 * @returns Array of YearlyRevenueBreakdown
 */
export function generateYearlyRevenueBreakdown(
  arbitrageSavingsYear1: number,
  peakShavingSavingsYear1: number,
  annualMaintenanceCost: number,
  subsidySchedule: SubsidyScheduleEntry[],
  years: number,
  electricityPriceGrowth: number,
  annualDegradation: number
): YearlyRevenueBreakdown[] {
  const breakdown: YearlyRevenueBreakdown[] = [];

  for (let year = 1; year <= years; year++) {
    const priceMultiplier = new Decimal(1).plus(new Decimal(electricityPriceGrowth)).pow(year - 1);
    const degradationMultiplier = new Decimal(1).minus(new Decimal(annualDegradation)).pow(year - 1);

    const arbitrage = new Decimal(arbitrageSavingsYear1).mul(priceMultiplier).mul(degradationMultiplier);
    const peakShaving = new Decimal(peakShavingSavingsYear1).mul(priceMultiplier).mul(degradationMultiplier);
    const maintenance = new Decimal(annualMaintenanceCost);

    const scheduleEntry = subsidySchedule.find(s => s.year === year);
    const sdeSubsidy = new Decimal(scheduleEntry ? scheduleEntry.sdeAmount : 0);

    const netRevenue = arbitrage.plus(peakShaving).plus(sdeSubsidy).minus(maintenance);

    breakdown.push({
      year,
      arbitrageSavings: arbitrage.toNumber(),
      peakShavingSavings: peakShaving.toNumber(),
      sdeSubsidy: sdeSubsidy.toNumber(),
      maintenanceCost: maintenance.toNumber(),
      netRevenue: netRevenue.toNumber(),
    });
  }

  return breakdown;
}
