import { Page, Text, View } from '@react-pdf/renderer';
import { createElement } from 'react';
import { styles, fmtPct, fmtEuro, fmtNumber } from '../styles';
import { createHeader } from '../components/pdf-header';
import { createFooter } from '../components/pdf-footer';
import { createKeyValueTable } from '../components/pdf-table';
import type { FullReportData } from '../../../types';

export function createTechnicalSpecs(data: FullReportData, pageNum: number, totalPages: number) {
  const { battery, results } = data;
  const reportDate = data.config.reportDate ?? new Date().toLocaleDateString('nl-NL');

  const regime = results.operatingRegime;
  const totalHours = Object.values(regime.hours).reduce((a, b) => a + b, 0);

  return createElement(Page, { size: 'A4', style: styles.page },
    createHeader('Technische Specificaties', pageNum, totalPages),

    createElement(Text, { style: styles.pageTitle }, 'Technische Specificaties'),

    createElement(Text, { style: styles.sectionTitle }, 'Batterijsysteem'),
    createKeyValueTable([
      ['Capaciteit', `${fmtNumber(battery.capacityKwh)} kWh`],
      ['Vermogen', `${fmtNumber(battery.powerKw)} kW`],
      ['Round-trip efficiency', fmtPct(battery.roundTripEfficiency)],
      ['Depth of Discharge', fmtPct(battery.depthOfDischarge)],
      ['Beschikbare capaciteit', `${fmtNumber(battery.capacityKwh * battery.depthOfDischarge)} kWh`],
      ['Levensduur', `${battery.lifespanYears} jaar`],
      ['Cycluslevensduur', `${fmtNumber(battery.cycleLife)} cycli`],
      ['Kosten per kWh', fmtEuro(battery.costPerKwh)],
      ['Installatiekosten', fmtEuro(battery.installationCost)],
      ['Jaarlijks onderhoud', fmtEuro(battery.annualMaintenanceCost)],
    ]),

    createElement(Text, { style: styles.sectionTitle }, 'Degradatieprofiel'),
    createKeyValueTable([
      ['Jaarlijkse degradatie', fmtPct(battery.annualDegradation)],
      ['Capaciteit na 5 jaar', fmtPct(Math.pow(1 - battery.annualDegradation, 5))],
      ['Capaciteit na 10 jaar', fmtPct(Math.pow(1 - battery.annualDegradation, 10))],
      ['Capaciteit na 15 jaar', fmtPct(Math.pow(1 - battery.annualDegradation, 15))],
    ]),

    createElement(Text, { style: styles.sectionTitle }, 'Operationeel Regime'),
    createKeyValueTable([
      ['Arbitrage (laden)', `${fmtNumber(regime.hours.arbitrage_charge)} uur (${fmtPct(regime.hours.arbitrage_charge / totalHours)})`],
      ['Arbitrage (ontladen)', `${fmtNumber(regime.hours.arbitrage_discharge)} uur (${fmtPct(regime.hours.arbitrage_discharge / totalHours)})`],
      ['Piekverlaging', `${fmtNumber(regime.hours.peak_shaving)} uur (${fmtPct(regime.hours.peak_shaving / totalHours)})`],
      ['Idle', `${fmtNumber(regime.hours.idle)} uur (${fmtPct(regime.hours.idle / totalHours)})`],
    ]),

    createElement(View, { style: styles.disclaimer },
      createElement(Text, null,
        'Indicatief \u2014 degradatieprofiel en operationeel regime zijn gebaseerd op de jaarsimulatie. Werkelijke prestaties hangen af van gebruik en omgevingsfactoren.'
      ),
    ),

    createFooter(reportDate),
  );
}
