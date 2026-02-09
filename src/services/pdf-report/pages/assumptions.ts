import { Page, Text } from '@react-pdf/renderer';
import { createElement } from 'react';
import { styles, fmtEuro, fmtPct, fmtEuroCents } from '../styles';
import { createHeader } from '../components/pdf-header';
import { createFooter } from '../components/pdf-footer';
import { createKeyValueTable } from '../components/pdf-table';
import type { FullReportData } from '../../../types';

export function createAssumptionsPage(data: FullReportData, pageNum: number, totalPages: number) {
  const { battery, tariffs, subsidies, financials, profile } = data;
  const reportDate = data.config.reportDate ?? new Date().toLocaleDateString('nl-NL');

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
      ['Databron', profile.dataSource === 'csv' ? 'CSV-upload' : 'Synthetisch profiel'],
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
      ['EIA percentage', fmtPct(subsidies.eiaPercentage)],
    ]),

    createElement(Text, { style: styles.sectionTitle }, 'Financieel'),
    createKeyValueTable([
      ['Discontovoet (WACC)', fmtPct(financials.discountRate)],
      ['Inflatie', fmtPct(financials.inflationRate)],
      ['Energieprijsstijging', fmtPct(financials.electricityPriceGrowthRate)],
      ['Analyseperiode', `${financials.years} jaar`],
    ]),

    createElement(Text, { style: styles.sectionTitle }, 'Methodologie'),
    createElement(Text, { style: styles.text },
      'De analyse combineert een uurlijkse simulatie (8.760 uren) met een ' +
      'discounted-cashflow-model. De simulatie optimaliseert batterijgebruik voor arbitrage ' +
      'en piekverlaging. Besparingen worden gecorrigeerd voor degradatie en prijsstijging. ' +
      'De NPV wordt berekend met de opgegeven WACC als discontovoet.'
    ),

    createFooter(reportDate),
  );
}
