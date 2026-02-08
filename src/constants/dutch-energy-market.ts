/**
 * Dutch Energy Market Constants
 *
 * All constants include: unit, source, validity period.
 * Internal values in SI units where applicable.
 */

// ═══════════════════════════════════════════════════════════════
// ENERGIEBELASTING (Energy Tax) — Staffels 2024/2025
// Bron: Belastingdienst, Wet belastingen op milieugrondslag
// ═══════════════════════════════════════════════════════════════

/** Energy tax bracket 1: 0 - 10,000 kWh — EUR/kWh — Bron: Belastingdienst 2024 */
export const ENERGY_TAX_BRACKET_1 = 0.12599;

/** Energy tax bracket 2: 10,000 - 50,000 kWh — EUR/kWh — Bron: Belastingdienst 2024 */
export const ENERGY_TAX_BRACKET_2 = 0.05468;

/** Energy tax bracket 3: 50,000 - 10,000,000 kWh — EUR/kWh — Bron: Belastingdienst 2024 */
export const ENERGY_TAX_BRACKET_3 = 0.01312;

/** Energy tax bracket 4: > 10,000,000 kWh — EUR/kWh — Bron: Belastingdienst 2024 */
export const ENERGY_TAX_BRACKET_4 = 0.00054;

/** Energy tax reduction (belastingvermindering) — EUR/year per connection — Bron: Belastingdienst 2024 */
export const ENERGY_TAX_REDUCTION = 631.0;

export const ENERGY_TAX_BRACKETS = [
  { maxKwh: 10_000, ratePerKwh: ENERGY_TAX_BRACKET_1 },
  { maxKwh: 50_000, ratePerKwh: ENERGY_TAX_BRACKET_2 },
  { maxKwh: 10_000_000, ratePerKwh: ENERGY_TAX_BRACKET_3 },
  { maxKwh: Infinity, ratePerKwh: ENERGY_TAX_BRACKET_4 },
] as const;

// ═══════════════════════════════════════════════════════════════
// ODE (Opslag Duurzame Energie) — 2024
// Bron: RVO / Belastingdienst
// ═══════════════════════════════════════════════════════════════

/** ODE bracket 1: 0 - 10,000 kWh — EUR/kWh — Bron: Belastingdienst 2024 */
export const ODE_BRACKET_1 = 0.01300;

/** ODE bracket 2: 10,000 - 50,000 kWh — EUR/kWh — Bron: Belastingdienst 2024 */
export const ODE_BRACKET_2 = 0.02060;

/** ODE bracket 3: 50,000 - 10,000,000 kWh — EUR/kWh — Bron: Belastingdienst 2024 */
export const ODE_BRACKET_3 = 0.00642;

/** ODE bracket 4: > 10,000,000 kWh — EUR/kWh — Bron: Belastingdienst 2024 */
export const ODE_BRACKET_4 = 0.00020;

export const ODE_BRACKETS = [
  { maxKwh: 10_000, ratePerKwh: ODE_BRACKET_1 },
  { maxKwh: 50_000, ratePerKwh: ODE_BRACKET_2 },
  { maxKwh: 10_000_000, ratePerKwh: ODE_BRACKET_3 },
  { maxKwh: Infinity, ratePerKwh: ODE_BRACKET_4 },
] as const;

// ═══════════════════════════════════════════════════════════════
// NETWERKTARIEVEN — Per regio, 2024
// Bron: ACM tarievenbesluit / Netbeheerder tariefbladen
// Eenheid: EUR/kW/jaar voor transport, EUR/kWh voor leverancier
// ═══════════════════════════════════════════════════════════════

export const NETWORK_TARIFFS = {
  liander: {
    /** Transport capacity tariff — EUR/kW/year — Bron: Liander tarievenblad 2024 */
    transportCapacityPerKwYear: 27.50,
    /** Measurement service — EUR/year — Bron: Liander 2024 */
    measurementServicePerYear: 75.0,
    region: 'Noord-Holland, Gelderland, Flevoland, Zuid-Holland (deel)',
  },
  enexis: {
    /** Transport capacity tariff — EUR/kW/year — Bron: Enexis tarievenblad 2024 */
    transportCapacityPerKwYear: 25.80,
    /** Measurement service — EUR/year — Bron: Enexis 2024 */
    measurementServicePerYear: 72.0,
    region: 'Noord-Brabant, Limburg, Groningen, Drenthe, Overijssel (deel)',
  },
  stedin: {
    /** Transport capacity tariff — EUR/kW/year — Bron: Stedin tarievenblad 2024 */
    transportCapacityPerKwYear: 29.10,
    /** Measurement service — EUR/year — Bron: Stedin 2024 */
    measurementServicePerYear: 78.0,
    region: 'Zuid-Holland (groot deel), Utrecht',
  },
} as const;

export type NetworkOperator = keyof typeof NETWORK_TARIFFS;

// ═══════════════════════════════════════════════════════════════
// SDE++ (Stimulering Duurzame Energieproductie en Klimaattransitie)
// Bron: RVO, SDE++ voorjaar 2024
// ═══════════════════════════════════════════════════════════════

/** SDE++ base amount for battery storage — EUR/kWh — Bron: RVO SDE++ 2024 */
export const SDE_BASE_AMOUNT = 0.068;

/** SDE++ correction amount (market price floor) — EUR/kWh — Bron: RVO 2024 */
export const SDE_CORRECTION_AMOUNT = 0.035;

/** SDE++ maximum subsidy duration — years — Bron: RVO */
export const SDE_DURATION_YEARS = 15;

/** SDE++ minimum full load hours for battery — hours/year — Bron: RVO */
export const SDE_MIN_FULL_LOAD_HOURS = 500;

// ═══════════════════════════════════════════════════════════════
// EIA (Energie Investeringsaftrek)
// Bron: RVO, Energielijst 2024
// ═══════════════════════════════════════════════════════════════

/** EIA deduction percentage of eligible investment — decimal — Bron: RVO 2024 */
export const EIA_PERCENTAGE = 0.455;

/** EIA minimum investment per asset — EUR — Bron: RVO 2024 */
export const EIA_MIN_INVESTMENT = 2_500;

/** EIA maximum deduction per fiscal year — EUR — Bron: RVO 2024 */
export const EIA_MAX_DEDUCTION = 136_000_000;

/** Assumed corporate tax rate for EIA benefit calculation — decimal — Bron: Belastingdienst 2024 */
export const CORPORATE_TAX_RATE = 0.258;

// ═══════════════════════════════════════════════════════════════
// BATTERIJ BENCHMARK WAARDEN
// Bron: NVDE, BloombergNEF, sectoranalyse COMCAM 2024
// ═══════════════════════════════════════════════════════════════

/** Battery all-in cost range — EUR/kWh — Bron: BloombergNEF / NVDE 2024 */
export const BATTERY_COST_RANGE = {
  low: 400,
  mid: 550,
  high: 700,
} as const;

/** Typical round-trip efficiency Li-ion — decimal — Bron: Manufacturer specs */
export const TYPICAL_EFFICIENCY = {
  low: 0.85,
  mid: 0.89,
  high: 0.92,
} as const;

/** Annual degradation rate — decimal — Bron: Manufacturer warranties / NREL */
export const TYPICAL_DEGRADATION = {
  low: 0.02,
  mid: 0.025,
  high: 0.03,
} as const;

// ═══════════════════════════════════════════════════════════════
// BENCHMARK TERUGVERDIENTIJDEN PER SECTOR
// Bron: COMCAM marktanalyse, 200+ business cases
// ═══════════════════════════════════════════════════════════════

export const PAYBACK_BENCHMARKS: Record<import('../types').Sector, {
  withoutSubsidy: { low: number; mid: number; high: number };
  withSubsidy: { low: number; mid: number; high: number };
}> = {
  hospitality:  { withoutSubsidy: { low: 6, mid: 8, high: 10 },   withSubsidy: { low: 4, mid: 5.5, high: 7 } },
  healthcare:   { withoutSubsidy: { low: 5, mid: 6.5, high: 8 },  withSubsidy: { low: 3.5, mid: 5, high: 6.5 } },
  retail:       { withoutSubsidy: { low: 6, mid: 8, high: 10 },   withSubsidy: { low: 4, mid: 5.5, high: 7 } },
  kantoor:      { withoutSubsidy: { low: 7, mid: 9, high: 11 },   withSubsidy: { low: 5, mid: 6.5, high: 8 } },
  industrie:    { withoutSubsidy: { low: 5, mid: 7, high: 9 },    withSubsidy: { low: 3.5, mid: 5, high: 7 } },
  logistiek:    { withoutSubsidy: { low: 6, mid: 8, high: 10 },   withSubsidy: { low: 4, mid: 6, high: 7.5 } },
  onderwijs:    { withoutSubsidy: { low: 7, mid: 9, high: 12 },   withSubsidy: { low: 5, mid: 7, high: 9 } },
  overig:       { withoutSubsidy: { low: 6, mid: 8.5, high: 11 }, withSubsidy: { low: 4, mid: 6, high: 8 } },
};

// ═══════════════════════════════════════════════════════════════
// EPEX PRIJSPATRONEN
// Bron: EPEX SPOT historische data 2023-2024
// ═══════════════════════════════════════════════════════════════

/** Typical peak-offpeak spread — EUR/kWh — Bron: EPEX SPOT 2024 */
export const PEAK_OFFPEAK_SPREAD = {
  low: 0.03,
  mid: 0.055,
  high: 0.08,
} as const;

/** Typical peak hours (CET) — Bron: EPEX / marktconventie */
export const PEAK_HOURS = {
  start: 7,
  end: 23,
} as const;

/**
 * Representative 24-hour EPEX day-ahead price profile — EUR/kWh
 * Based on weighted average of NL EPEX SPOT 2023-2024 data.
 * Index 0 = 00:00 CET, Index 23 = 23:00 CET.
 *
 * Pattern: overnight low, morning ramp, midday solar dip, evening peak, late decline.
 * Bron: EPEX SPOT NL, ENTSO-E Transparency Platform, 2023-2024 gewogen gemiddelde
 */
export const EPEX_TYPICAL_PROFILE: number[] = [
  0.065, // 00:00 — overnight low
  0.058, // 01:00
  0.052, // 02:00 — overnight minimum
  0.050, // 03:00
  0.055, // 04:00
  0.070, // 05:00 — early morning ramp
  0.095, // 06:00
  0.135, // 07:00 — morning peak starts
  0.155, // 08:00 — morning peak
  0.145, // 09:00
  0.120, // 10:00 — solar dip begins
  0.100, // 11:00
  0.085, // 12:00 — midday solar dip
  0.080, // 13:00 — lowest midday (solar peak)
  0.090, // 14:00
  0.110, // 15:00 — afternoon ramp
  0.140, // 16:00
  0.180, // 17:00 — evening peak starts
  0.210, // 18:00 — evening peak
  0.195, // 19:00 — evening peak
  0.165, // 20:00
  0.140, // 21:00
  0.110, // 22:00
  0.085, // 23:00
];

// ═══════════════════════════════════════════════════════════════
// STANDAARD FINANCIËLE PARAMETERS
// Bron: COMCAM, marktstandaard voor energieprojecten
// ═══════════════════════════════════════════════════════════════

/** Default WACC for energy storage projects — decimal — Bron: Marktstandaard */
export const DEFAULT_DISCOUNT_RATE = 0.06;

/** Default inflation rate — decimal — Bron: CPB ramingen 2024 */
export const DEFAULT_INFLATION_RATE = 0.025;

/** Default electricity price growth — decimal — Bron: PBL/CPB scenarios */
export const DEFAULT_ELECTRICITY_PRICE_GROWTH = 0.03;

/** Default analysis horizon — years */
export const DEFAULT_ANALYSIS_YEARS = 15;

// ═══════════════════════════════════════════════════════════════
// SCENARIO MULTIPLIERS
// ═══════════════════════════════════════════════════════════════

export const SCENARIO_MULTIPLIERS = {
  optimistic: {
    electricityPriceGrowth: 1.2,
    batteryCost: 0.85,
    discountRate: 0.9,
    tariffSpread: 1.3,
  },
  base: {
    electricityPriceGrowth: 1.0,
    batteryCost: 1.0,
    discountRate: 1.0,
    tariffSpread: 1.0,
  },
  pessimistic: {
    electricityPriceGrowth: 0.8,
    batteryCost: 1.15,
    discountRate: 1.2,
    tariffSpread: 0.7,
  },
} as const;

// ═══════════════════════════════════════════════════════════════
// MAANDNAMEN (Nederlands)
// ═══════════════════════════════════════════════════════════════

export const MONTH_NAMES = [
  'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
  'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December',
] as const;

/** Hours per month (non-leap year) */
export const HOURS_PER_MONTH = [744, 672, 744, 720, 744, 720, 744, 744, 720, 744, 720, 744] as const;

/** Total hours per year */
export const HOURS_PER_YEAR = 8760;

// ═══════════════════════════════════════════════════════════════
// SECTOR LAADPROFIELEN
// Bron: NEDU standaardprofielen, CBS energieverbruik per sector
// ═══════════════════════════════════════════════════════════════

/** 24-hour load shape multipliers per sector (relative to daily average) */
export const SECTOR_LOAD_SHAPES: Record<import('../types').Sector, number[]> = {
  hospitality: [0.4, 0.35, 0.3, 0.3, 0.35, 0.5, 0.8, 1.1, 1.3, 1.2, 1.1, 1.0,
                1.1, 1.0, 0.9, 0.9, 1.0, 1.2, 1.4, 1.3, 1.1, 0.9, 0.7, 0.5],
  healthcare:  [0.6, 0.55, 0.5, 0.5, 0.55, 0.7, 0.9, 1.2, 1.5, 1.4, 1.3, 1.2,
                1.2, 1.3, 1.2, 1.1, 1.0, 0.9, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55],
  retail:      [0.3, 0.25, 0.2, 0.2, 0.25, 0.4, 0.7, 1.0, 1.4, 1.5, 1.5, 1.4,
                1.3, 1.3, 1.4, 1.5, 1.5, 1.4, 1.2, 0.8, 0.5, 0.4, 0.35, 0.3],
  kantoor:     [0.2, 0.2, 0.2, 0.2, 0.2, 0.3, 0.6, 1.2, 1.6, 1.7, 1.7, 1.6,
                1.3, 1.5, 1.6, 1.6, 1.5, 1.2, 0.6, 0.3, 0.25, 0.2, 0.2, 0.2],
  industrie:   [0.7, 0.7, 0.7, 0.7, 0.7, 0.8, 1.0, 1.3, 1.5, 1.5, 1.5, 1.4,
                1.2, 1.4, 1.5, 1.5, 1.3, 1.0, 0.8, 0.7, 0.7, 0.7, 0.7, 0.7],
  logistiek:   [0.3, 0.3, 0.3, 0.3, 0.4, 0.8, 1.2, 1.5, 1.6, 1.5, 1.4, 1.3,
                1.2, 1.3, 1.4, 1.5, 1.4, 1.0, 0.7, 0.5, 0.4, 0.3, 0.3, 0.3],
  onderwijs:   [0.2, 0.2, 0.2, 0.2, 0.2, 0.3, 0.6, 1.2, 1.7, 1.8, 1.8, 1.7,
                1.3, 1.5, 1.7, 1.7, 1.5, 0.8, 0.4, 0.25, 0.2, 0.2, 0.2, 0.2],
  overig:      [0.5, 0.45, 0.4, 0.4, 0.45, 0.6, 0.8, 1.1, 1.4, 1.4, 1.3, 1.2,
                1.2, 1.3, 1.3, 1.3, 1.2, 1.0, 0.8, 0.7, 0.6, 0.55, 0.5, 0.5],
};

/** Weekend consumption multiplier per sector */
export const SECTOR_WEEKEND_FACTOR: Record<import('../types').Sector, number> = {
  hospitality: 1.1,
  healthcare: 0.75,
  retail: 1.15,
  kantoor: 0.25,
  industrie: 0.6,
  logistiek: 0.4,
  onderwijs: 0.15,
  overig: 0.7,
};

/** Dutch display labels for sectors */
export const SECTOR_LABELS: Record<import('../types').Sector, string> = {
  hospitality: 'Hospitality',
  healthcare: 'Zorg',
  retail: 'Retail',
  kantoor: 'Kantoor',
  industrie: 'Industrie',
  logistiek: 'Logistiek',
  onderwijs: 'Onderwijs',
  overig: 'Overig',
};

// ═══════════════════════════════════════════════════════════════
// KAPITAALKOSTEN BENCHMARKS
// Bron: DNB, marktdata 2024/2025
// ═══════════════════════════════════════════════════════════════

/** Kapitaalkosten referenties voor vergelijking met batterij-IRR */
export const CAPITAL_COST_BENCHMARKS = {
  /** ~3% Nederlandse staatsobligatie 10-jaars — Bron: DNB 2024/2025 */
  dutchGovernmentBond10yr: 0.03,
  /** ~3.5% zakelijke spaarrekening — Bron: Marktgemiddelde 2024/2025 */
  bankDeposit: 0.035,
  /** 6% gewogen gemiddelde vermogenskosten — Bron: Marktstandaard */
  typicalWACC: 0.06,
  /** 10% private equity minimum rendement — Bron: Sectoranalyse */
  privateEquityHurdle: 0.10,
} as const;

// ═══════════════════════════════════════════════════════════════
// CO2 EMISSIEFACTOREN
// Bron: CBS/IPCC, marginale emissiedata 2023
// ═══════════════════════════════════════════════════════════════

/** CO2 emissiefactoren Nederlands elektriciteitsnet (kg CO2/kWh) */
export const CO2_EMISSION_FACTORS = {
  /** Gemiddelde CO2-uitstoot NL net — kg CO2/kWh — Bron: CBS/IPCC 2023 */
  gridAverage: 0.328,
  /** Marginale emissie piekuren (gascentrale) — kg CO2/kWh — Bron: Sectoranalyse 2023 */
  peakHourMarginal: 0.45,
  /** Marginale emissie daluren — kg CO2/kWh — Bron: Sectoranalyse 2023 */
  offPeakMarginal: 0.30,
} as const;
