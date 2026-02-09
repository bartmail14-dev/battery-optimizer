/** Battery system configuration */
export interface BatteryConfig {
  /** Total energy capacity in kWh */
  capacityKwh: number;
  /** Maximum charge/discharge power in kW */
  powerKw: number;
  /** Round-trip efficiency as decimal (0.85-0.92 for Li-ion) */
  roundTripEfficiency: number;
  /** Annual capacity degradation as decimal (0.02-0.03 typical) */
  annualDegradation: number;
  /** Total cycle life before end-of-life */
  cycleLife: number;
  /** Maximum depth of discharge as decimal (0-1) */
  depthOfDischarge: number;
  /** Cost per kWh of battery capacity in EUR */
  costPerKwh: number;
  /** One-time installation cost in EUR */
  installationCost: number;
  /** Annual maintenance cost in EUR */
  annualMaintenanceCost: number;
  /** Expected system lifespan in years */
  lifespanYears: number;
}

/** Energy consumption profile for a facility */
export interface EnergyProfile {
  /** Hourly consumption in kWh for a full year (8760 values) */
  hourlyConsumptionKwh: number[];
  /** Peak demand in kW */
  peakDemandKw: number;
  /** Total annual consumption in kWh */
  annualConsumptionKwh: number;
  /** Grid connection capacity in kW */
  connectionCapacityKw: number;
  /** Sector type */
  sector: Sector;
  /** How the hourly profile was constructed */
  dataSource?: 'synthetic' | 'csv';
}

export type Sector =
  | 'hospitality'
  | 'healthcare'
  | 'retail'
  | 'kantoor'
  | 'industrie'
  | 'logistiek'
  | 'onderwijs'
  | 'overig';

/** Dutch energy tariff structure */
export interface TariffStructure {
  /** Commodity rate per kWh in EUR */
  commodityRatePerKwh: number;
  /** Peak rate per kWh in EUR (daytime) */
  peakRate: number;
  /** Off-peak rate per kWh in EUR (nighttime/weekend) */
  offPeakRate: number;
  /** Network tariff per kW of contracted capacity in EUR/year */
  networkTariffPerKw: number;
  /** Energy tax per kWh in EUR */
  energyTaxPerKwh: number;
  /** ODE surcharge per kWh in EUR */
  odeSurchargePerKwh: number;
  /** Feed-in tariff per kWh in EUR */
  feedInTariffPerKwh: number;
  /** Pricing mode: fixed peak/off-peak or dynamic EPEX day-ahead */
  pricingMode: 'fixed' | 'dynamic';
  /** 24-hour price profile in EUR/kWh for dynamic pricing (index 0 = 00:00) */
  hourlyPrices?: number[];
}

/** Subsidy configuration for Dutch market */
export interface SubsidyConfig {
  /** Whether SDE++ subsidy is applicable */
  sdeEligible: boolean;
  /** SDE++ base amount in EUR/kWh */
  sdeBaseAmount: number;
  /** EIA percentage of eligible investment (0-1) */
  eiaPercentage: number;
  /** EIA maximum deduction in EUR */
  eiaMaxDeduction: number;
}

/** Financial parameters for investment analysis */
export interface FinancialParams {
  /** Weighted average cost of capital as decimal */
  discountRate: number;
  /** Annual inflation rate as decimal */
  inflationRate: number;
  /** Annual electricity price growth rate as decimal */
  electricityPriceGrowthRate: number;
  /** Analysis horizon in years */
  years: number;
}

export type Scenario = 'optimistic' | 'base' | 'pessimistic';

/** Monthly breakdown of costs and savings */
export interface MonthlyBreakdown {
  /** Month index (0-11) */
  month: number;
  /** Monthly label (e.g., "Januari") */
  label: string;
  /** Cost without battery in EUR */
  costWithout: number;
  /** Cost with battery in EUR */
  costWith: number;
  /** Monthly savings in EUR */
  savings: number;
  /** Energy charged in kWh */
  energyCharged: number;
  /** Energy discharged in kWh */
  energyDischarged: number;
  /** Number of cycles */
  cycles: number;
}

/** Result for a single scenario */
export interface ScenarioResult {
  scenario: Scenario;
  npv: number;
  irr: number;
  simplePayback: number;
  discountedPayback: number;
  annualSavings: number;
  totalSavings: number;
  lcos: number;
}

/** Per-year breakdown of financial components */
export interface YearlyBreakdown {
  /** Year index: 0 = investment, 1-N = operational */
  year: number;
  /** Gross savings for this year (after degradation and price growth) */
  grossSavings: number;
  /** Maintenance cost for this year */
  maintenance: number;
  /** SDE++ subsidy contribution for this year */
  subsidy: number;
  /** Net cashflow (= cashflows[year]) */
  netCashflow: number;
  /** Cumulative cashflow up to and including this year */
  cumulativeCashflow: number;
  /** Degradation factor: (1 - annualDegradation)^year */
  degradationFactor: number;
  /** Discount factor: 1 / (1 + discountRate)^year */
  discountFactor: number;
  /** Discounted cashflow: netCashflow * discountFactor */
  discountedCashflow: number;
  /** Running sum of discounted cashflows */
  cumulativeDiscountedCashflow: number;
}

/** Operating regime classification for a single hour */
export type OperatingRegime = 'arbitrage_charge' | 'arbitrage_discharge' | 'peak_shaving' | 'idle';

/** Aggregated operating regime breakdown */
export interface OperatingRegimeBreakdown {
  hours: Record<OperatingRegime, number>;
  revenue: Record<OperatingRegime, number>;
}

/** Single entry in the subsidy schedule over project lifetime */
export interface SubsidyScheduleEntry {
  year: number;
  sdeAmount: number;
  eiaAmount: number;
  totalSubsidy: number;
  isSdeActive: boolean;
}

/** Yearly revenue breakdown with component detail */
export interface YearlyRevenueBreakdown {
  year: number;
  arbitrageSavings: number;
  peakShavingSavings: number;
  sdeSubsidy: number;
  maintenanceCost: number;
  netRevenue: number;
}

/** CO2 timeline entry per year */
export interface CO2TimelineEntry {
  year: number;
  annualReductionKg: number;
  cumulativeReductionKg: number;
  treesEquivalent: number;
}

/** Payback confidence based on scenario spread */
export interface PaybackConfidence {
  optimistic: number;
  base: number;
  pessimistic: number;
  rangeYears: number;
  confidence: 'hoog' | 'midden' | 'laag';
}

/** Complete calculation result */
export interface CalculationResult {
  /** Net present value in EUR */
  npv: number;
  /** Internal rate of return as decimal */
  irr: number;
  /** Simple payback period in years */
  simplePayback: number;
  /** Discounted payback period in years */
  discountedPayback: number;
  /** Annual savings in EUR (first year) */
  annualSavings: number;
  /** Total savings over analysis period in EUR */
  totalSavings: number;
  /** Levelized cost of storage in EUR/kWh */
  lcos: number;
  /** Monthly breakdown for first year */
  monthlyBreakdown: MonthlyBreakdown[];
  /** Results per scenario */
  scenarioResults: ScenarioResult[];
  /** Peak shaving savings in EUR/year */
  peakShavingSavings: number;
  /** Peak reduction in kW */
  peakReductionKw: number;
  /** Gross investment before EIA */
  grossInvestment: number;
  /** Net investment after EIA */
  netInvestment: number;
  /** Annual SDE++ subsidy */
  annualSubsidy: number;
  /** Year-by-year cashflows for chart (index 0 = year 0 = investment) */
  cashflows: number[];
  /** Savings purely from energy arbitrage (= simulation.totalSavings, excl. peak shaving) */
  arbitrageSavings: number;
  /** Per-year financial breakdown with component detail */
  yearlyBreakdown: YearlyBreakdown[];
  /** Hourly simulation results for visualization */
  simulation: AnnualSimulationResult;
  /** Gewogen gemiddelde netprijs EUR/kWh */
  blendedGridPrice: number;
  /** Geschatte jaarlijkse CO2-reductie in kg */
  co2ReductionKg: number;
  /** NPV without any subsidies */
  noSubsidyNpv: number;
  /** Payback without subsidies */
  noSubsidyPayback: number;
  /** IRR without subsidies */
  noSubsidyIrr: number;
  /** Total subsidy impact in EUR (NPV with subsidies - NPV without) */
  subsidyImpactEur: number;
  /** Operating regime breakdown */
  operatingRegime: OperatingRegimeBreakdown;
  /** Subsidy schedule over project lifetime */
  subsidySchedule: SubsidyScheduleEntry[];
  /** Yearly revenue breakdown with component detail */
  yearlyRevenueBreakdown: YearlyRevenueBreakdown[];
  /** CO2 timeline per year */
  co2Timeline: CO2TimelineEntry[];
  /** Payback confidence based on scenario spread */
  paybackConfidence: PaybackConfidence;
  /** Warnings generated during calculation (e.g. cycleLife exceeded) */
  warnings: string[];
  /** Effective lifespan in years, accounting for cycle life limits */
  effectiveLifespanYears: number;
}

/** Full dashboard state */
export interface DashboardState {
  batteryConfig: BatteryConfig;
  energyProfile: EnergyProfile;
  tariffs: TariffStructure;
  subsidies: SubsidyConfig;
  financialParams: FinancialParams;
  selectedScenario: Scenario;
  results: CalculationResult | null;
}

/** Hourly simulation result for a single hour */
export interface HourlySimulationResult {
  hour: number;
  consumption: number;
  batteryCharge: number;
  batteryDischarge: number;
  stateOfCharge: number;
  gridImport: number;
  costWithBattery: number;
  costWithoutBattery: number;
}

/** Annual simulation result */
export interface AnnualSimulationResult {
  hourlyResults: HourlySimulationResult[];
  totalCostWithBattery: number;
  totalCostWithoutBattery: number;
  totalSavings: number;
  totalCharged: number;
  totalDischarged: number;
  totalCycles: number;
  peakReduction: number;
}

/** Sensitivity analysis data point */
export interface SensitivityDataPoint {
  variable: string;
  label: string;
  lowValue: number;
  baseValue: number;
  highValue: number;
  lowNpv: number;
  baseNpv: number;
  highNpv: number;
  unit: string;
}

/** Chat message for AI advisor */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

/** Configuratie voor professioneel PDF-rapport */
export interface PdfReportConfig {
  clientName: string;
  projectRef?: string;
  reportDate?: string;
  consultantName?: string;
  includeAiAnalysis?: boolean;
  aiReportText?: string;
}

/** Alle data voor volledig rapport */
export interface FullReportData {
  config: PdfReportConfig;
  results: CalculationResult;
  battery: BatteryConfig;
  profile: EnergyProfile;
  tariffs: TariffStructure;
  subsidies: SubsidyConfig;
  financials: FinancialParams;
  sensitivity: SensitivityDataPoint[];
}

/** Configuratie voor Excel-export */
export interface ExcelExportConfig {
  clientName: string;
  projectRef?: string;
}

/** Benoemde batterijconfiguratie voor vergelijking */
export interface NamedBatteryConfig {
  id: string;
  label: string;
  config: BatteryConfig;
}

/** Resultaat per configuratie in vergelijking */
export interface ComparisonResult {
  configId: string;
  label: string;
  config: BatteryConfig;
  results: CalculationResult;
  sensitivity: SensitivityDataPoint[];
}

/** Samenvatting opgeslagen project */
export interface ProjectSummary {
  id: string;
  name: string;
  description: string;
  sector: string;
  annualConsumptionKwh: number;
  peakDemandKw: number;
  dataSource: string;
  createdAt: string;
  updatedAt: string;
}

/** Preset battery profile */
export interface PresetProfile {
  name: string;
  description: string;
  sector: Sector;
  batteryConfig: Partial<BatteryConfig>;
  energyProfile: Partial<EnergyProfile>;
}

/** Result of parsing kwartierdata CSV */
export interface KwartierDataParseResult {
  success: boolean;
  hourlyConsumptionKwh: number[];
  annualConsumptionKwh: number;
  peakDemandKw: number;
  rowsParsed: number;
  gaps: number;
  error?: string;
  warnings: string[];
}
