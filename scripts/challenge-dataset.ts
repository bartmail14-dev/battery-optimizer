/**
 * Uitdagende testdataset: "Grand Hotel De Veluwe"
 *
 * Scenario: 4-sterren congreshotel met 280 kamers, restaurant, spa, en
 * conferentiezalen. Hoog energieverbruik door HVAC, professionele keuken,
 * wellness (sauna/zwembad), en 24/7 operatie. Seizoenspieken door
 * congresactiviteiten in voor- en najaar.
 *
 * Uitdagingen:
 * - Hoge peak-to-base ratio (3.5x) — test batterijdimensionering
 * - Krappe tariefspread (0.08/kWh) — test of savings realistisch klein zijn
 * - Hoge discontovoet (8%) — strenge WACC, maakt NPV uitdagend
 * - Lage energieprijsstijging (1.5%) — conservatief
 * - Grotere batterij dan nodig — test overcapaciteit-scenario
 * - SDE++ net niet optimaal (lage base amount) — test subsidie edge case
 * - Hoge degradatie (3%/jaar) — test langetermijnimpact
 */

import { calculateFullResult, sensitivityAnalysis } from '../src/services/calculations';
import { generateHourlyProfile } from '../src/hooks/useCalculation';
import type {
  BatteryConfig,
  EnergyProfile,
  TariffStructure,
  SubsidyConfig,
  FinancialParams,
} from '../src/types';

// ============================================================================
// DATASET: Grand Hotel De Veluwe (280 kamers, congreshotel)
// ============================================================================

const battery: BatteryConfig = {
  capacityKwh: 400,          // Bewust groot: overcapaciteit testen
  powerKw: 150,              // C-rate ~0.375 (conservatief)
  roundTripEfficiency: 0.87, // Iets onder gemiddeld (ouder LFP systeem)
  annualDegradation: 0.03,   // Hoog: stresstest langetermijn
  cycleLife: 5000,           // Lager dan premium systemen
  depthOfDischarge: 0.85,    // Conservatief — niet tot 90%
  costPerKwh: 620,           // Premium vanwege maatwerk installatie
  installationCost: 45000,   // Inclusief transformatoraanpassing
  annualMaintenanceCost: 6500, // Servicecontract + monitoring
  lifespanYears: 12,         // Korter dan standaard — hoge degradatie
};

// Genereer realistisch uurprofiel
const annualConsumption = 850000; // 850 MWh — groot congreshotel
const peakDemand = 320;           // Hoge piekvraag door HVAC + keuken
const hourlyConsumption = generateHourlyProfile(annualConsumption, peakDemand, 'hospitality');

const profile: EnergyProfile = {
  hourlyConsumptionKwh: hourlyConsumption,
  peakDemandKw: peakDemand,
  annualConsumptionKwh: annualConsumption,
  connectionCapacityKw: 400,
  sector: 'hospitality',
};

const tariffs: TariffStructure = {
  commodityRatePerKwh: 0.105,    // Onder gemiddeld — groot contract
  peakRate: 0.19,                // Relatief laag door volume
  offPeakRate: 0.11,             // Spread van slechts €0.08/kWh
  networkTariffPerKw: 32.50,     // Liander tarief
  energyTaxPerKwh: 0.01312,     // 2024 schijf
  odeSurchargePerKwh: 0.00642,  // 2024 tarief
  feedInTariffPerKwh: 0.055,    // Laag: geen teruglevering verwacht
};

const subsidies: SubsidyConfig = {
  sdeEligible: true,
  sdeBaseAmount: 0.055,        // Laag: net boven correctiebedrag → minimale SDE
  eiaPercentage: 0.455,        // Standaard EIA 2024
  eiaMaxDeduction: 136000000,  // Standaard plafond
};

const financials: FinancialParams = {
  discountRate: 0.08,                  // Hoge WACC — hotelketen met schulden
  inflationRate: 0.025,                // Standaard
  electricityPriceGrowthRate: 0.015,   // Conservatief — nauwelijks boven inflatie
  years: 12,                           // Gelijk aan batterijlevensduur
};

// ============================================================================
// BEREKEN & RAPPORTEER
// ============================================================================

console.log('═══════════════════════════════════════════════════════════════');
console.log('  CHALLENGE DATASET: Grand Hotel De Veluwe (280 kamers)');
console.log('═══════════════════════════════════════════════════════════════\n');

// Input samenvatting
const totalInvestment = battery.capacityKwh * battery.costPerKwh + battery.installationCost;
console.log('📋 INPUT PARAMETERS');
console.log('───────────────────────────────────────────────────────────────');
console.log(`  Batterij:        ${battery.capacityKwh} kWh / ${battery.powerKw} kW (C-rate: ${(battery.powerKw / battery.capacityKwh).toFixed(2)})`);
console.log(`  Efficiency:      ${(battery.roundTripEfficiency * 100).toFixed(0)}% round-trip`);
console.log(`  Degradatie:      ${(battery.annualDegradation * 100).toFixed(1)}%/jaar`);
console.log(`  DoD:             ${(battery.depthOfDischarge * 100).toFixed(0)}%`);
console.log(`  Investering:     € ${totalInvestment.toLocaleString('nl-NL')}`);
console.log(`  Onderhoud:       € ${battery.annualMaintenanceCost.toLocaleString('nl-NL')}/jaar`);
console.log(`  Levensduur:      ${battery.lifespanYears} jaar`);
console.log(`  Verbruik:        ${(annualConsumption / 1000).toFixed(0)} MWh/jaar`);
console.log(`  Piekvraag:       ${peakDemand} kW`);
console.log(`  Piek/dal spread: € ${(tariffs.peakRate - tariffs.offPeakRate).toFixed(2)}/kWh`);
console.log(`  WACC:            ${(financials.discountRate * 100).toFixed(1)}%`);
console.log(`  Prijsstijging:   ${(financials.electricityPriceGrowthRate * 100).toFixed(1)}%/jaar`);
console.log(`  SDE basisbedrag: € ${subsidies.sdeBaseAmount}/kWh`);
console.log();

// Bereken
const result = calculateFullResult(battery, profile, tariffs, subsidies, financials);

console.log('📊 BASISSCENARIO RESULTATEN');
console.log('───────────────────────────────────────────────────────────────');
console.log(`  NPV:                  € ${result.npv.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}`);
console.log(`  IRR:                  ${isFinite(result.irr) ? (result.irr * 100).toFixed(1) + '%' : 'N/A'}`);
console.log(`  Terugverdientijd:     ${isFinite(result.simplePayback) ? result.simplePayback.toFixed(1) + ' jaar' : '> analyseperiode'}`);
console.log(`  Verdisconteerd:       ${isFinite(result.discountedPayback) ? result.discountedPayback.toFixed(1) + ' jaar' : '> analyseperiode'}`);
console.log(`  Jaarlijkse besparing: € ${result.annualSavings.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}`);
console.log(`  Totale besparing:     € ${result.totalSavings.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}`);
console.log(`  LCOS:                 € ${result.lcos.toFixed(3)}/kWh`);
console.log();

// Scenario vergelijking
console.log('🔄 SCENARIOVERGELIJKING');
console.log('───────────────────────────────────────────────────────────────');
console.log('  Scenario        │     NPV     │ Payback │ Jaarlijks');
console.log('  ────────────────┼─────────────┼─────────┼──────────');
for (const s of result.scenarioResults) {
  const label = { optimistic: 'Optimistisch', base: 'Basis       ', pessimistic: 'Pessimistisch' }[s.scenario] ?? s.scenario;
  const npvStr = `€ ${s.npv.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}`.padStart(11);
  const payStr = isFinite(s.simplePayback) ? `${s.simplePayback.toFixed(1)}j`.padStart(7) : '   >max';
  const savStr = `€ ${s.annualSavings.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}`.padStart(8);
  console.log(`  ${label} │ ${npvStr} │ ${payStr} │ ${savStr}`);
}
console.log();

// Maandoverzicht
console.log('📅 MAANDELIJKSE BREAKDOWN (Jaar 1)');
console.log('───────────────────────────────────────────────────────────────');
console.log('  Maand      │ Zonder bat. │  Met bat.  │ Besparing');
console.log('  ───────────┼─────────────┼────────────┼──────────');
for (const m of result.monthlyBreakdown) {
  const label = m.label.padEnd(11);
  const without = `€ ${m.costWithout.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}`.padStart(11);
  const withBat = `€ ${m.costWith.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}`.padStart(10);
  const saving = `€ ${m.savings.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}`.padStart(8);
  console.log(`  ${label} │ ${without} │ ${withBat} │ ${saving}`);
}
console.log();

// Gevoeligheidsanalyse
const sensitivity = sensitivityAnalysis(battery, profile, tariffs, subsidies, financials);
console.log('🌡️  GEVOELIGHEIDSANALYSE (Tornado)');
console.log('───────────────────────────────────────────────────────────────');
console.log('  Variabele          │   Low NPV   │  Base NPV  │  High NPV');
console.log('  ───────────────────┼─────────────┼────────────┼───────────');
for (const s of sensitivity) {
  const label = s.label.padEnd(19);
  const low = `€ ${s.lowNpv.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}`.padStart(11);
  const base = `€ ${s.baseNpv.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}`.padStart(10);
  const high = `€ ${s.highNpv.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}`.padStart(9);
  console.log(`  ${label} │ ${low} │ ${base} │ ${high}`);
}
console.log();

// Profiel check
const maxHour = Math.max(...hourlyConsumption);
const minHour = Math.min(...hourlyConsumption.filter(v => v > 0));
const avgHour = hourlyConsumption.reduce((s, v) => s + v, 0) / 8760;
console.log('⚡ VERBRUIKSPROFIEL CHECK');
console.log('───────────────────────────────────────────────────────────────');
console.log(`  Gemiddeld uur:    ${avgHour.toFixed(1)} kWh`);
console.log(`  Maximum uur:      ${maxHour.toFixed(1)} kWh`);
console.log(`  Minimum uur:      ${minHour.toFixed(2)} kWh`);
console.log(`  Piek/basis ratio: ${(maxHour / minHour).toFixed(1)}x`);
console.log(`  Profieltotaal:    ${(hourlyConsumption.reduce((s, v) => s + v, 0) / 1000).toFixed(0)} MWh`);
console.log();

// Beoordeling
console.log('🎯 BEOORDELING');
console.log('───────────────────────────────────────────────────────────────');
const verdict: string[] = [];
if (result.npv > 0) verdict.push('✅ Positieve NPV — waardecreërend');
else verdict.push('⚠️  Negatieve NPV — investering vernietigt waarde bij deze WACC');

if (result.simplePayback < financials.years) verdict.push(`✅ Terugverdiend binnen levensduur (${result.simplePayback.toFixed(1)} < ${financials.years} jaar)`);
else verdict.push('❌ Terugverdientijd overschrijdt levensduur');

if (result.irr > financials.discountRate) verdict.push(`✅ IRR (${(result.irr * 100).toFixed(1)}%) > WACC (${(financials.discountRate * 100).toFixed(1)}%)`);
else if (isFinite(result.irr)) verdict.push(`⚠️  IRR (${(result.irr * 100).toFixed(1)}%) < WACC (${(financials.discountRate * 100).toFixed(1)}%)`);
else verdict.push('⚠️  IRR niet berekenbaar');

const spread = tariffs.peakRate - tariffs.offPeakRate;
if (spread < 0.10) verdict.push(`⚠️  Krappe tariefspread (€${spread.toFixed(2)}/kWh) — beperkt arbitrage-potentieel`);

if (battery.annualDegradation >= 0.03) verdict.push(`⚠️  Hoge degradatie (${(battery.annualDegradation * 100)}%/jaar) — capaciteit daalt snel`);

for (const v of verdict) console.log(`  ${v}`);

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  Dataset doorgerekend. Alle waarden zijn deterministisch.');
console.log('═══════════════════════════════════════════════════════════════');
