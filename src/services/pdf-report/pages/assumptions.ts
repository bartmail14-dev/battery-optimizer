import { Page, Text } from '@react-pdf/renderer';
import { createElement } from 'react';
import { styles, fmtEuro, fmtPct, fmtEuroCents } from '../styles';
import { createHeader } from '../components/pdf-header';
import { createFooter } from '../components/pdf-footer';
import { createKeyValueTable } from '../components/pdf-table';
import type { FullReportData } from '../../../types';
import {
  CO2_EMISSION_FACTORS,
  PEAK_HOURS,
  CORPORATE_TAX_RATE,
  SDE_MIN_FULL_LOAD_HOURS,
  SDE_DURATION_YEARS,
  SCENARIO_MULTIPLIERS,
} from '../../../constants';
import { SENSITIVITY_RANGES } from '../../../constants/sensitivity-ranges';

export function createAssumptionsPage(data: FullReportData, pageNum: number, totalPages: number) {
  const { battery, tariffs, subsidies, financials, profile } = data;
  const reportDate = data.config.reportDate ?? new Date().toLocaleDateString('nl-NL');

  const opt = SCENARIO_MULTIPLIERS.optimistic;
  const pes = SCENARIO_MULTIPLIERS.pessimistic;

  return createElement(Page, { size: 'A4', style: styles.page },
    createHeader('Aannames & Methodologie', pageNum, totalPages),

    createElement(Text, { style: styles.pageTitle }, 'Aannames & Methodologie'),

    createElement(Text, { style: styles.sectionTitle }, 'Batterij'),
    createKeyValueTable([
      ['Capaciteit', `${battery.capacityKwh} kWh`],
      ['Vermogen', `${battery.powerKw} kW`],
      ['Round-trip efficiency', fmtPct(battery.roundTripEfficiency)],
      ['Jaarlijkse degradatie', fmtPct(battery.annualDegradation)],
      ['Cycluslevensduur', `${battery.cycleLife} cycli`],
      ['Depth of Discharge', fmtPct(battery.depthOfDischarge)],
      ['Kosten per kWh', fmtEuro(battery.costPerKwh)],
      ['Installatiekosten', fmtEuro(battery.installationCost)],
      ['Jaarlijks onderhoud', fmtEuro(battery.annualMaintenanceCost)],
      ['Levensduur', `${battery.lifespanYears} jaar`],
    ]),

    createElement(Text, { style: styles.sectionTitle }, 'Energieprofiel'),
    createKeyValueTable([
      ['Sector', profile.sector],
      ['Jaarverbruik', `${(profile.annualConsumptionKwh / 1000).toFixed(0)} MWh`],
      ['Piekvraag', `${profile.peakDemandKw} kW`],
      ['Aansluitcapaciteit', `${profile.connectionCapacityKw} kW`],
      ['Databron', profile.dataSource === 'csv' ? 'CSV-upload (werkelijke kwartierdata)' : 'Synthetisch profiel (NEDU-sectorprofiel)'],
    ]),

    createElement(Text, { style: styles.sectionTitle }, 'Tarieven'),
    createKeyValueTable([
      ['Tariefmodel', tariffs.pricingMode === 'dynamic' ? 'Dynamisch (EPEX)' : 'Vast piek/dal'],
      ['Piektarief', `${fmtEuroCents(tariffs.peakRate)}/kWh`],
      ['Daltarief', `${fmtEuroCents(tariffs.offPeakRate)}/kWh`],
      ['Netwerktarief', `${fmtEuroCents(tariffs.networkTariffPerKw)}/kW/jaar`],
      ['Energiebelasting', `${fmtEuroCents(tariffs.energyTaxPerKwh)}/kWh`],
      ['ODE-toeslag', `${fmtEuroCents(tariffs.odeSurchargePerKwh)}/kWh`],
    ]),

    createElement(Text, { style: styles.sectionTitle }, 'Subsidies'),
    createKeyValueTable([
      ['SDE++ geschikt', subsidies.sdeEligible ? 'Ja' : 'Nee'],
      ['SDE++ basisbedrag', `${fmtEuroCents(subsidies.sdeBaseAmount)}/kWh`],
      ['SDE++ looptijd', `${SDE_DURATION_YEARS} jaar (Bron: RVO)`],
      ['SDE++ min. vollasturen', `${SDE_MIN_FULL_LOAD_HOURS} uur/jaar (Bron: RVO)`],
      ['EIA percentage', fmtPct(subsidies.eiaPercentage)],
      ['Vpb-tarief (EIA)', `${fmtPct(CORPORATE_TAX_RATE)} (Bron: Belastingdienst 2024)`],
    ]),

    createElement(Text, { style: styles.sectionTitle }, 'Financieel'),
    createKeyValueTable([
      ['Discontovoet (WACC)', fmtPct(financials.discountRate)],
      ['Inflatie', fmtPct(financials.inflationRate)],
      ['Energieprijsstijging', fmtPct(financials.electricityPriceGrowthRate)],
      ['Analyseperiode', `${financials.years} jaar`],
    ]),

    createElement(Text, { style: styles.sectionTitle }, 'Berekende aannames'),
    createKeyValueTable([
      ['CO\u2082 piekuren (marginaal)', `${CO2_EMISSION_FACTORS.peakHourMarginal} kg/kWh (gascentrale \u2014 CBS/IPCC 2023)`],
      ['CO\u2082 daluren (marginaal)', `${CO2_EMISSION_FACTORS.offPeakMarginal} kg/kWh (CBS/IPCC 2023)`],
      ['Piekuren definitie', `${String(PEAK_HOURS.start).padStart(2, '0')}:00\u2013${String(PEAK_HOURS.end).padStart(2, '0')}:00 (EPEX marktconventie)`],
    ]),

    createElement(Text, { style: styles.sectionTitle }, 'Scenario-aannames'),
    createKeyValueTable([
      ['Optimistisch: energieprijsgroei', `\u00D7${opt.electricityPriceGrowth}`],
      ['Optimistisch: batterijkosten', `\u00D7${opt.batteryCost}`],
      ['Pessimistisch: energieprijsgroei', `\u00D7${pes.electricityPriceGrowth}`],
      ['Pessimistisch: batterijkosten', `\u00D7${pes.batteryCost}`],
      ['Sensitivity: energieprijs', `\u00D7${SENSITIVITY_RANGES.electricityPrice.low} / \u00D7${SENSITIVITY_RANGES.electricityPrice.high}`],
      ['Sensitivity: batterijkosten', `\u00D7${SENSITIVITY_RANGES.batteryCost.low} / \u00D7${SENSITIVITY_RANGES.batteryCost.high}`],
      ['Sensitivity: WACC', `\u00D7${SENSITIVITY_RANGES.discountRate.low} / \u00D7${SENSITIVITY_RANGES.discountRate.high}`],
      ['Sensitivity: degradatie', `\u00D7${SENSITIVITY_RANGES.degradation.low} / \u00D7${SENSITIVITY_RANGES.degradation.high}`],
    ]),

    createElement(Text, { style: styles.sectionTitle }, 'Methodologie'),
    createElement(Text, { style: styles.text },
      'De analyse combineert een uurlijkse simulatie (8.760 uren) met een ' +
      'discounted-cashflow-model. De simulatie optimaliseert batterijgebruik voor arbitrage ' +
      'en piekverlaging. Besparingen worden gecorrigeerd voor degradatie en prijsstijging. ' +
      'De NPV wordt berekend met de opgegeven WACC als discontovoet. ' +
      'CO\u2082-reductie is berekend op basis van het verschil tussen marginale emissies tijdens ' +
      'piek- en daluren, gecorrigeerd voor de round-trip efficiency van het batterijsysteem.'
    ),

    createFooter(reportDate),
  );
}
