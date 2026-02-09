/**
 * Battery Sizing Recommendation Engine
 *
 * Given an energy profile + tariffs + subsidies + financials,
 * determines the optimal battery capacity and power rating
 * by sweeping through candidates and maximizing NPV.
 *
 * Algorithm:
 * 1. Derive search range from profile (daily consumption, peak demand)
 * 2. Coarse sweep: evaluate NPV at logarithmically spaced capacities
 * 3. Fine sweep: narrow around the peak
 * 4. Return best candidate + alternatives (conservative/aggressive)
 */
import type {
  BatteryConfig,
  EnergyProfile,
  TariffStructure,
  SubsidyConfig,
  FinancialParams,
} from '../../types';
import {
  BATTERY_COST_RANGE,
  TYPICAL_EFFICIENCY,
  TYPICAL_DEGRADATION,
  SDE_MIN_FULL_LOAD_HOURS,
} from '../../constants/dutch-energy-market';
import { runSingleAnalysis } from './scenario-engine';

// ─── Types ───────────────────────────────────────────────────

export interface SizingCandidate {
  capacityKwh: number;
  powerKw: number;
  npv: number;
  irr: number;
  simplePayback: number | null;
  annualSavings: number;
  grossInvestment: number;
  netInvestment: number;
}

export interface SizingRecommendation {
  /** The best candidate by NPV */
  recommended: SizingCandidate;
  /** All evaluated candidates for chart visualization */
  candidates: SizingCandidate[];
  /** A smaller/cheaper option for risk-averse decision */
  conservative: SizingCandidate | null;
  /** A larger option for maximum savings */
  aggressive: SizingCandidate | null;
  /** Human-readable rationale in Dutch */
  rationale: string;
  /** Default battery config to auto-fill the form */
  batteryConfig: BatteryConfig;
}

// ─── Constants for sizing ────────────────────────────────────

/** Typical C-rate: 0.5C = 2 hours full charge/discharge */
const DEFAULT_C_RATE = 0.5;

/** Installation cost per kWh (scales with system size, decreasing marginal) */
function estimateInstallationCost(capacityKwh: number): number {
  // Base €5,000 + €60/kWh for small systems, decreasing to €30/kWh for large
  const perKwh = 60 - Math.min(30, capacityKwh / 20);
  return 5000 + capacityKwh * perKwh;
}

/** Annual maintenance cost per kWh */
function estimateMaintenanceCost(capacityKwh: number): number {
  // Base €500 + €8/kWh/year
  return 500 + capacityKwh * 8;
}

// ─── Core Algorithm ──────────────────────────────────────────

function buildBatteryConfig(capacityKwh: number): BatteryConfig {
  return {
    capacityKwh,
    powerKw: Math.round(capacityKwh * DEFAULT_C_RATE),
    roundTripEfficiency: TYPICAL_EFFICIENCY.mid,
    annualDegradation: TYPICAL_DEGRADATION.mid,
    cycleLife: 6000,
    depthOfDischarge: 0.9,
    costPerKwh: BATTERY_COST_RANGE.mid,
    installationCost: Math.round(estimateInstallationCost(capacityKwh)),
    annualMaintenanceCost: Math.round(estimateMaintenanceCost(capacityKwh)),
    lifespanYears: 15,
  };
}

function evaluateCandidate(
  capacityKwh: number,
  profile: EnergyProfile,
  tariffs: TariffStructure,
  subsidies: SubsidyConfig,
  financials: FinancialParams
): SizingCandidate {
  const battery = buildBatteryConfig(capacityKwh);
  const result = runSingleAnalysis(battery, profile, tariffs, subsidies, financials);

  return {
    capacityKwh,
    powerKw: battery.powerKw,
    npv: result.npv,
    irr: result.irr,
    simplePayback: result.simplePayback,
    annualSavings: result.annualSavings,
    grossInvestment: result.grossInvestment,
    netInvestment: result.netInvestment,
  };
}

/**
 * Generate logarithmically spaced capacity candidates
 * anchored to the profile's characteristics.
 */
function generateCandidates(profile: EnergyProfile): number[] {
  const dailyConsumption = profile.annualConsumptionKwh / 365;

  // Min: ~5% of daily consumption (small system for peak shaving)
  const minCapacity = Math.max(10, Math.round(dailyConsumption * 0.05));

  // Max: ~50% of daily consumption (massive system, diminishing returns)
  const maxCapacity = Math.max(100, Math.round(dailyConsumption * 0.5));

  // Also consider SDE++ threshold: need 500 full load hours/year
  // So capacity should yield discharge ≥ capacity × 500
  // Practical constraint: capacity where FLH ≈ 500
  const sdeCapacity = Math.round(profile.annualConsumptionKwh * 0.05 / SDE_MIN_FULL_LOAD_HOURS * SDE_MIN_FULL_LOAD_HOURS / 365 * 365 / SDE_MIN_FULL_LOAD_HOURS);

  // Generate ~15 candidates logarithmically spaced
  const candidates: number[] = [];
  const logMin = Math.log10(minCapacity);
  const logMax = Math.log10(maxCapacity);
  const steps = 14;

  for (let i = 0; i <= steps; i++) {
    const logVal = logMin + (logMax - logMin) * (i / steps);
    const raw = Math.pow(10, logVal);
    // Round to nice numbers
    const rounded = raw < 50 ? Math.round(raw / 5) * 5
      : raw < 200 ? Math.round(raw / 10) * 10
      : raw < 1000 ? Math.round(raw / 25) * 25
      : Math.round(raw / 50) * 50;
    if (rounded > 0 && !candidates.includes(rounded)) {
      candidates.push(rounded);
    }
  }

  // Add SDE sweet spot if not already there
  if (sdeCapacity > 0 && !candidates.includes(sdeCapacity)) {
    candidates.push(sdeCapacity);
  }

  return candidates.sort((a, b) => a - b);
}

// ─── Public API ──────────────────────────────────────────────

export function recommendBatterySize(
  profile: EnergyProfile,
  tariffs: TariffStructure,
  subsidies: SubsidyConfig,
  financials: FinancialParams
): SizingRecommendation {
  // 1. Generate candidate capacities from profile
  const capacities = generateCandidates(profile);

  // 2. Evaluate all candidates
  const candidates = capacities.map((cap) =>
    evaluateCandidate(cap, profile, tariffs, subsidies, financials)
  );

  // 3. Find the best by NPV
  let bestIdx = 0;
  for (let i = 1; i < candidates.length; i++) {
    if (candidates[i].npv > candidates[bestIdx].npv) {
      bestIdx = i;
    }
  }

  // 4. Fine-tune: search ±30% around the best with finer steps
  const best = candidates[bestIdx];
  const fineMin = Math.max(10, Math.round(best.capacityKwh * 0.7));
  const fineMax = Math.round(best.capacityKwh * 1.3);
  const fineStep = Math.max(5, Math.round((fineMax - fineMin) / 10));

  let fineBest = best;
  for (let cap = fineMin; cap <= fineMax; cap += fineStep) {
    const candidate = evaluateCandidate(cap, profile, tariffs, subsidies, financials);
    candidates.push(candidate);
    if (candidate.npv > fineBest.npv) {
      fineBest = candidate;
    }
  }

  // 5. Select conservative (70% of recommended) and aggressive (150%)
  const conservativeCap = Math.max(10, Math.round(fineBest.capacityKwh * 0.6));
  const aggressiveCap = Math.round(fineBest.capacityKwh * 1.6);

  const conservative = evaluateCandidate(conservativeCap, profile, tariffs, subsidies, financials);
  const aggressive = evaluateCandidate(aggressiveCap, profile, tariffs, subsidies, financials);

  // 6. Sort all candidates by capacity for chart
  const allCandidates = [...candidates, conservative, aggressive]
    .sort((a, b) => a.capacityKwh - b.capacityKwh);

  // Deduplicate by capacity
  const seen = new Set<number>();
  const uniqueCandidates = allCandidates.filter((c) => {
    if (seen.has(c.capacityKwh)) return false;
    seen.add(c.capacityKwh);
    return true;
  });

  // 7. Generate rationale
  const rationale = generateRationale(fineBest, conservative, aggressive, profile);

  // 8. Build the recommended BatteryConfig for form auto-fill
  const batteryConfig = buildBatteryConfig(fineBest.capacityKwh);

  return {
    recommended: fineBest,
    candidates: uniqueCandidates,
    conservative: conservative.npv > -conservative.grossInvestment * 0.5 ? conservative : null,
    aggressive: aggressive.npv > 0 ? aggressive : null,
    rationale,
    batteryConfig,
  };
}

function generateRationale(
  recommended: SizingCandidate,
  conservative: SizingCandidate,
  aggressive: SizingCandidate,
  profile: EnergyProfile
): string {
  const ratio = (recommended.capacityKwh / (profile.annualConsumptionKwh / 365) * 100).toFixed(0);
  const parts: string[] = [];

  parts.push(
    `Op basis van uw jaarverbruik van ${(profile.annualConsumptionKwh / 1000).toFixed(0)} MWh ` +
    `adviseren wij een batterij van ${recommended.capacityKwh} kWh / ${recommended.powerKw} kW ` +
    `(${ratio}% van uw dagverbruik).`
  );

  if (recommended.npv > 0) {
    parts.push(
      `Dit levert een netto contante waarde van €${Math.round(recommended.npv).toLocaleString('nl-NL')} ` +
      `en een terugverdientijd van ${recommended.simplePayback != null ? recommended.simplePayback.toFixed(1) : '>'} jaar.`
    );
  } else {
    parts.push(
      `Let op: met de huidige tarieven en kosten is de investering financieel marginaal ` +
      `(NPV €${Math.round(recommended.npv).toLocaleString('nl-NL')}). ` +
      `Dit kan verbeteren bij hogere energieprijzen of lagere batterijkosten.`
    );
  }

  if (conservative.npv > 0 && conservative.capacityKwh < recommended.capacityKwh) {
    parts.push(
      `Conservatief alternatief: ${conservative.capacityKwh} kWh ` +
      `(NPV €${Math.round(conservative.npv).toLocaleString('nl-NL')}, lager risico).`
    );
  }

  if (aggressive.npv > recommended.npv && aggressive.capacityKwh > recommended.capacityKwh) {
    parts.push(
      `Ambitieus alternatief: ${aggressive.capacityKwh} kWh ` +
      `(NPV €${Math.round(aggressive.npv).toLocaleString('nl-NL')}, hogere besparingen).`
    );
  }

  return parts.join(' ');
}
