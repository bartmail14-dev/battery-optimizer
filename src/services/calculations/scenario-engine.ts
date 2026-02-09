import type {
  BatteryConfig,
  EnergyProfile,
  TariffStructure,
  SubsidyConfig,
  FinancialParams,
  Scenario,
  ScenarioResult,
  CalculationResult,
  SensitivityDataPoint,
  PaybackConfidence,
} from '../../types';
import { SCENARIO_MULTIPLIERS, CO2_EMISSION_FACTORS, PEAK_HOURS } from '../../constants';
import { SENSITIVITY_RANGES } from '../../constants/sensitivity-ranges';
import { KPI_THRESHOLDS } from '../../constants/kpi-thresholds';
import { simulateBatteryOperation, getMonthlyBreakdown } from './battery-simulation';
import {
  calculateNPV,
  calculateIRR,
  calculateSimplePayback,
  calculateDiscountedPayback,
  calculateLCOS,
  generateCashflows,
  generateYearlyBreakdown,
  generateYearlyRevenueBreakdown,
} from './financial-model';
import { calculateTotalSubsidyPerYear, getEffectiveInvestment, generateSubsidySchedule } from './subsidy-calculator';
import { aggregateRegimeBreakdown } from './regime-analyzer';

/**
 * Runs a full analysis for a single parameter set and returns all financial metrics.
 */
export function runSingleAnalysis(
  battery: BatteryConfig,
  profile: EnergyProfile,
  tariffs: TariffStructure,
  subsidies: SubsidyConfig,
  financials: FinancialParams
): Omit<ScenarioResult, 'scenario'> & { simulation: import('../../types').AnnualSimulationResult; grossInvestment: number; netInvestment: number; annualSubsidy: number; peakShavingSavings: number; peakReductionKw: number } {
  const simulation = simulateBatteryOperation(profile, battery, tariffs);

  // Peak shaving: reduction in contracted capacity × network tariff
  const peakReductionKw = Math.max(0, simulation.peakReduction);
  const peakShavingSavings = peakReductionKw * tariffs.networkTariffPerKw;

  // Total annual savings = energy arbitrage + peak shaving
  const annualSavings = simulation.totalSavings + peakShavingSavings;

  const grossInvestment = battery.capacityKwh * battery.costPerKwh + battery.installationCost;
  const netInvestment = getEffectiveInvestment(grossInvestment, subsidies);
  const annualSubsidy = calculateTotalSubsidyPerYear(battery, subsidies, simulation.totalDischarged);

  // Generate subsidy schedule so cashflows respect SDE++ 15-year limit
  const schedule = generateSubsidySchedule(
    battery,
    subsidies,
    simulation.totalDischarged,
    grossInvestment,
    financials.years
  );

  const cashflows = generateCashflows(
    netInvestment,
    annualSavings,
    battery.annualMaintenanceCost,
    financials.years,
    financials.electricityPriceGrowthRate,
    battery.annualDegradation,
    annualSubsidy,
    schedule
  );

  const npv = calculateNPV(cashflows, financials.discountRate);
  const irr = calculateIRR(cashflows);
  const simplePayback = calculateSimplePayback(cashflows);
  const discountedPayback = calculateDiscountedPayback(cashflows, financials.discountRate);
  const lcos = calculateLCOS(
    grossInvestment,
    battery.annualMaintenanceCost,
    simulation.totalDischarged,
    financials.years,
    financials.discountRate,
    battery.annualDegradation
  );

  const totalSavings = cashflows.slice(1).reduce((sum, cf) => sum + cf, 0);

  return {
    npv,
    irr,
    simplePayback,
    discountedPayback,
    annualSavings,
    totalSavings,
    lcos,
    simulation,
    grossInvestment,
    netInvestment,
    annualSubsidy,
    peakShavingSavings,
    peakReductionKw,
  };
}

/**
 * Applies scenario multipliers to base parameters.
 */
function applyScenario(
  battery: BatteryConfig,
  tariffs: TariffStructure,
  financials: FinancialParams,
  scenario: Scenario
): { battery: BatteryConfig; tariffs: TariffStructure; financials: FinancialParams } {
  const multipliers = SCENARIO_MULTIPLIERS[scenario];

  // Scale the peak/off-peak spread around the midpoint
  const mid = (tariffs.peakRate + tariffs.offPeakRate) / 2;
  const halfSpread = (tariffs.peakRate - tariffs.offPeakRate) / 2;
  const scaledHalfSpread = halfSpread * multipliers.tariffSpread;

  // Also scale dynamic hourly prices if present
  let scaledHourlyPrices = tariffs.hourlyPrices;
  if (tariffs.hourlyPrices) {
    const meanPrice = tariffs.hourlyPrices.reduce((s, v) => s + v, 0) / tariffs.hourlyPrices.length;
    scaledHourlyPrices = tariffs.hourlyPrices.map((p) =>
      meanPrice + (p - meanPrice) * multipliers.tariffSpread
    );
  }

  return {
    battery: {
      ...battery,
      costPerKwh: battery.costPerKwh * multipliers.batteryCost,
    },
    tariffs: {
      ...tariffs,
      peakRate: mid + scaledHalfSpread,
      offPeakRate: mid - scaledHalfSpread,
      hourlyPrices: scaledHourlyPrices,
    },
    financials: {
      ...financials,
      electricityPriceGrowthRate: financials.electricityPriceGrowthRate * multipliers.electricityPriceGrowth,
      discountRate: financials.discountRate * multipliers.discountRate,
    },
  };
}

/**
 * Generates results for all three scenarios (optimistic, base, pessimistic).
 */
export function generateScenarios(
  battery: BatteryConfig,
  profile: EnergyProfile,
  tariffs: TariffStructure,
  subsidies: SubsidyConfig,
  financials: FinancialParams
): ScenarioResult[] {
  const scenarios: Scenario[] = ['optimistic', 'base', 'pessimistic'];

  return scenarios.map((scenario) => {
    const { battery: adjustedBattery, tariffs: adjustedTariffs, financials: adjustedFinancials } = applyScenario(
      battery,
      tariffs,
      financials,
      scenario
    );

    const result = runSingleAnalysis(adjustedBattery, profile, adjustedTariffs, subsidies, adjustedFinancials);

    return {
      scenario,
      ...result,
    };
  });
}

/**
 * Runs the complete calculation and returns the full result set.
 */
export function calculateFullResult(
  battery: BatteryConfig,
  profile: EnergyProfile,
  tariffs: TariffStructure,
  subsidies: SubsidyConfig,
  financials: FinancialParams
): CalculationResult {
  // --- Cycle life enforcement ---
  // Run simulation first to determine annual cycles
  const initialSimulation = simulateBatteryOperation(profile, battery, tariffs);
  const warnings: string[] = [];
  const annualCycles = initialSimulation.totalCycles;
  const cycleLifeYears = annualCycles > 0
    ? Math.floor(battery.cycleLife / annualCycles)
    : Infinity;
  const effectiveLifespanYears = Math.min(financials.years, cycleLifeYears);

  if (effectiveLifespanYears < financials.years) {
    warnings.push(
      `Batterij bereikt einde levenscyclus (${battery.cycleLife} cycli) na ${effectiveLifespanYears} jaar i.p.v. ${financials.years} jaar. Financiële berekeningen zijn aangepast.`
    );
  }

  // Use adjusted financials for ALL calculations (base + scenarios)
  const adjustedFinancials: FinancialParams = {
    ...financials,
    years: effectiveLifespanYears,
  };

  // Base scenario financial metrics (with adjusted horizon)
  const baseResult = runSingleAnalysis(battery, profile, tariffs, subsidies, adjustedFinancials);
  const monthlyBreakdown = getMonthlyBreakdown(baseResult.simulation);

  // All three scenarios (with adjusted horizon)
  const scenarioResults = generateScenarios(battery, profile, tariffs, subsidies, adjustedFinancials);

  // 3. Subsidy schedule (needed before cashflows to respect SDE++ 15-year limit)
  const subsidySchedule = generateSubsidySchedule(
    battery,
    subsidies,
    baseResult.simulation.totalDischarged,
    baseResult.grossInvestment,
    adjustedFinancials.years
  );

  // Generate cashflows for chart visualization (uses subsidySchedule to stop SDE++ after year 15)
  const cashflows = generateCashflows(
    baseResult.netInvestment,
    baseResult.annualSavings,
    battery.annualMaintenanceCost,
    adjustedFinancials.years,
    adjustedFinancials.electricityPriceGrowthRate,
    battery.annualDegradation,
    baseResult.annualSubsidy,
    subsidySchedule
  );

  // Arbitrage savings = total energy savings from simulation (excludes peak shaving)
  const arbitrageSavings = baseResult.simulation.totalSavings;

  // Per-year financial breakdown (uses subsidySchedule to stop SDE++ after year 15)
  const yearlyBreakdown = generateYearlyBreakdown(
    baseResult.netInvestment,
    baseResult.annualSavings,
    battery.annualMaintenanceCost,
    adjustedFinancials.years,
    adjustedFinancials.electricityPriceGrowthRate,
    battery.annualDegradation,
    baseResult.annualSubsidy,
    adjustedFinancials.discountRate,
    subsidySchedule
  );

  // Blended grid price: weighted average cost per kWh without battery
  const blendedGridPrice = profile.annualConsumptionKwh > 0
    ? baseResult.simulation.totalCostWithoutBattery / profile.annualConsumptionKwh
    : 0;

  // CO2 reduction estimate: discharge shifts from peak (high marginal emission) to off-peak charging
  const co2ReductionKg = baseResult.simulation.totalDischarged * (
    CO2_EMISSION_FACTORS.peakHourMarginal -
    CO2_EMISSION_FACTORS.offPeakMarginal / battery.roundTripEfficiency
  );

  // --- Phase 2 extensions ---

  // 1. No-subsidy comparison: run analysis without any subsidies
  const noSubsidyConfig: SubsidyConfig = {
    ...subsidies,
    sdeEligible: false,
    eiaPercentage: 0,
  };
  const noSubsidyResult = runSingleAnalysis(battery, profile, tariffs, noSubsidyConfig, adjustedFinancials);
  const subsidyImpactEur = baseResult.npv - noSubsidyResult.npv;

  // 2. Operating regime breakdown
  const operatingRegime = aggregateRegimeBreakdown(
    baseResult.simulation.hourlyResults,
    PEAK_HOURS.start,
    PEAK_HOURS.end
  );

  // 4. CO2 timeline
  const co2Timeline = [];
  let cumulativeCO2 = 0;
  for (let year = 1; year <= adjustedFinancials.years; year++) {
    const degradationFactor = Math.pow(1 - battery.annualDegradation, year - 1);
    const annualReductionKg = co2ReductionKg * degradationFactor;
    cumulativeCO2 += annualReductionKg;
    co2Timeline.push({
      year,
      annualReductionKg,
      cumulativeReductionKg: cumulativeCO2,
      treesEquivalent: Math.round(cumulativeCO2 / 21),
    });
  }

  // 5. Yearly revenue breakdown
  const yearlyRevenueBreakdown = generateYearlyRevenueBreakdown(
    arbitrageSavings,
    baseResult.peakShavingSavings,
    battery.annualMaintenanceCost,
    subsidySchedule,
    adjustedFinancials.years,
    adjustedFinancials.electricityPriceGrowthRate,
    battery.annualDegradation
  );

  // 6. Payback confidence from scenario results
  const optimisticScenario = scenarioResults.find(s => s.scenario === 'optimistic')!;
  const baseScenario = scenarioResults.find(s => s.scenario === 'base')!;
  const pessimisticScenario = scenarioResults.find(s => s.scenario === 'pessimistic')!;

  const rawRange = pessimisticScenario.simplePayback - optimisticScenario.simplePayback;
  const rangeYears = isFinite(rawRange) ? rawRange : Infinity;
  let confidence: 'hoog' | 'midden' | 'laag';
  if (rangeYears <= KPI_THRESHOLDS.paybackConfidence.high) {
    confidence = 'hoog';
  } else if (rangeYears <= KPI_THRESHOLDS.paybackConfidence.medium) {
    confidence = 'midden';
  } else {
    confidence = 'laag';
  }

  const paybackConfidence: PaybackConfidence = {
    optimistic: optimisticScenario.simplePayback,
    base: baseScenario.simplePayback,
    pessimistic: pessimisticScenario.simplePayback,
    rangeYears,
    confidence,
  };

  return {
    npv: baseResult.npv,
    irr: baseResult.irr,
    simplePayback: baseResult.simplePayback,
    discountedPayback: baseResult.discountedPayback,
    annualSavings: baseResult.annualSavings,
    totalSavings: baseResult.totalSavings,
    lcos: baseResult.lcos,
    monthlyBreakdown,
    scenarioResults,
    peakShavingSavings: baseResult.peakShavingSavings,
    peakReductionKw: baseResult.peakReductionKw,
    grossInvestment: baseResult.grossInvestment,
    netInvestment: baseResult.netInvestment,
    annualSubsidy: baseResult.annualSubsidy,
    cashflows,
    arbitrageSavings,
    yearlyBreakdown,
    simulation: baseResult.simulation,
    blendedGridPrice,
    co2ReductionKg,
    noSubsidyNpv: noSubsidyResult.npv,
    noSubsidyPayback: noSubsidyResult.simplePayback,
    noSubsidyIrr: noSubsidyResult.irr,
    subsidyImpactEur,
    operatingRegime,
    subsidySchedule,
    yearlyRevenueBreakdown,
    co2Timeline,
    paybackConfidence,
    warnings,
    effectiveLifespanYears,
  };
}

/**
 * Performs sensitivity analysis on a single variable.
 *
 * Varies the specified parameter over a range and calculates NPV for each value.
 * Used for tornado charts.
 */
export function sensitivityAnalysis(
  battery: BatteryConfig,
  profile: EnergyProfile,
  tariffs: TariffStructure,
  subsidies: SubsidyConfig,
  financials: FinancialParams
): SensitivityDataPoint[] {
  const variables: {
    key: string;
    label: string;
    unit: string;
    getBase: () => number;
    applyLow: () => { battery: BatteryConfig; tariffs: TariffStructure; financials: FinancialParams };
    applyHigh: () => { battery: BatteryConfig; tariffs: TariffStructure; financials: FinancialParams };
    lowMultiplier: number;
    highMultiplier: number;
  }[] = [
    {
      key: 'electricityPrice',
      label: 'Energieprijs',
      unit: 'EUR/kWh',
      getBase: () => tariffs.peakRate,
      lowMultiplier: SENSITIVITY_RANGES.electricityPrice.low,
      highMultiplier: SENSITIVITY_RANGES.electricityPrice.high,
      applyLow: () => ({
        battery,
        tariffs: { ...tariffs, peakRate: tariffs.peakRate * SENSITIVITY_RANGES.electricityPrice.low, offPeakRate: tariffs.offPeakRate * SENSITIVITY_RANGES.electricityPrice.low },
        financials,
      }),
      applyHigh: () => ({
        battery,
        tariffs: { ...tariffs, peakRate: tariffs.peakRate * SENSITIVITY_RANGES.electricityPrice.high, offPeakRate: tariffs.offPeakRate * SENSITIVITY_RANGES.electricityPrice.high },
        financials,
      }),
    },
    {
      key: 'batteryCost',
      label: 'Batterijkosten',
      unit: 'EUR/kWh',
      getBase: () => battery.costPerKwh,
      lowMultiplier: SENSITIVITY_RANGES.batteryCost.low,
      highMultiplier: SENSITIVITY_RANGES.batteryCost.high,
      applyLow: () => ({
        battery: { ...battery, costPerKwh: battery.costPerKwh * SENSITIVITY_RANGES.batteryCost.low },
        tariffs,
        financials,
      }),
      applyHigh: () => ({
        battery: { ...battery, costPerKwh: battery.costPerKwh * SENSITIVITY_RANGES.batteryCost.high },
        tariffs,
        financials,
      }),
    },
    {
      key: 'discountRate',
      label: 'Discontovoet (WACC)',
      unit: '%',
      getBase: () => financials.discountRate * 100,
      lowMultiplier: SENSITIVITY_RANGES.discountRate.low,
      highMultiplier: SENSITIVITY_RANGES.discountRate.high,
      applyLow: () => ({
        battery,
        tariffs,
        financials: { ...financials, discountRate: financials.discountRate * SENSITIVITY_RANGES.discountRate.low },
      }),
      applyHigh: () => ({
        battery,
        tariffs,
        financials: { ...financials, discountRate: financials.discountRate * SENSITIVITY_RANGES.discountRate.high },
      }),
    },
    {
      key: 'degradation',
      label: 'Degradatie',
      unit: '%/jaar',
      getBase: () => battery.annualDegradation * 100,
      lowMultiplier: SENSITIVITY_RANGES.degradation.low,
      highMultiplier: SENSITIVITY_RANGES.degradation.high,
      applyLow: () => ({
        battery: { ...battery, annualDegradation: battery.annualDegradation * SENSITIVITY_RANGES.degradation.low },
        tariffs,
        financials,
      }),
      applyHigh: () => ({
        battery: { ...battery, annualDegradation: battery.annualDegradation * SENSITIVITY_RANGES.degradation.high },
        tariffs,
        financials,
      }),
    },
    {
      key: 'priceGrowth',
      label: 'Energieprijsstijging',
      unit: '%/jaar',
      getBase: () => financials.electricityPriceGrowthRate * 100,
      lowMultiplier: SENSITIVITY_RANGES.priceGrowth.low,
      highMultiplier: SENSITIVITY_RANGES.priceGrowth.high,
      applyLow: () => ({
        battery,
        tariffs,
        financials: { ...financials, electricityPriceGrowthRate: financials.electricityPriceGrowthRate * SENSITIVITY_RANGES.priceGrowth.low },
      }),
      applyHigh: () => ({
        battery,
        tariffs,
        financials: { ...financials, electricityPriceGrowthRate: financials.electricityPriceGrowthRate * SENSITIVITY_RANGES.priceGrowth.high },
      }),
    },
  ];

  // Cycle life enforcement: compute effective lifespan (same logic as calculateFullResult)
  const baseSim = simulateBatteryOperation(profile, battery, tariffs);
  const baseCycleLifeYears = baseSim.totalCycles > 0
    ? Math.floor(battery.cycleLife / baseSim.totalCycles)
    : Infinity;
  const baseEffectiveYears = Math.min(financials.years, baseCycleLifeYears);
  const baseAdjustedFinancials: FinancialParams = { ...financials, years: baseEffectiveYears };

  const baseNpv = runSingleAnalysis(battery, profile, tariffs, subsidies, baseAdjustedFinancials).npv;

  return variables.map((v) => {
    const low = v.applyLow();
    const high = v.applyHigh();

    // Each variant may have different cycle life due to changed battery/financials
    const lowEffYears = Math.min(low.financials.years, baseCycleLifeYears);
    const highEffYears = Math.min(high.financials.years, baseCycleLifeYears);
    const lowAdjFin: FinancialParams = { ...low.financials, years: lowEffYears };
    const highAdjFin: FinancialParams = { ...high.financials, years: highEffYears };

    const lowNpv = runSingleAnalysis(low.battery, profile, low.tariffs, subsidies, lowAdjFin).npv;
    const highNpv = runSingleAnalysis(high.battery, profile, high.tariffs, subsidies, highAdjFin).npv;

    return {
      variable: v.key,
      label: v.label,
      lowValue: v.getBase() * v.lowMultiplier,
      baseValue: v.getBase(),
      highValue: v.getBase() * v.highMultiplier,
      lowNpv,
      baseNpv,
      highNpv,
      unit: v.unit,
    };
  });
}
