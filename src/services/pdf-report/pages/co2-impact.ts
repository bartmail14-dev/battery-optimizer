import { Page, Text } from '@react-pdf/renderer';
import { createElement } from 'react';
import { styles, fmtNumber } from '../styles';
import { createHeader } from '../components/pdf-header';
import { createFooter } from '../components/pdf-footer';
import { createTable } from '../components/pdf-table';
import { createMetricsRow } from '../components/pdf-metric-box';
import type { FullReportData } from '../../../types';

export function createCO2Impact(data: FullReportData, pageNum: number, totalPages: number) {
  const { results } = data;
  const reportDate = data.config.reportDate ?? new Date().toLocaleDateString('nl-NL');

  const lastEntry = results.co2Timeline[results.co2Timeline.length - 1];
  const totalReduction = lastEntry?.cumulativeReductionKg ?? 0;
  const totalTrees = lastEntry?.treesEquivalent ?? 0;

  const headers = ['Jaar', 'Jaarlijkse reductie (kg)', 'Cumulatief (kg)', 'Bomen-equivalent'];
  const rows = results.co2Timeline.map((e) => [
    `Jaar ${e.year}`,
    fmtNumber(Math.round(e.annualReductionKg)),
    fmtNumber(Math.round(e.cumulativeReductionKg)),
    fmtNumber(Math.round(e.treesEquivalent)),
  ]);

  return createElement(Page, { size: 'A4', style: styles.page },
    createHeader('CO\u2082 Impact', pageNum, totalPages),

    createElement(Text, { style: styles.pageTitle }, 'CO\u2082 Impact'),

    createMetricsRow([
      { value: `${fmtNumber(Math.round(results.co2ReductionKg))} kg`, label: 'Jaarlijkse CO\u2082-reductie', variant: 'green' },
      { value: `${fmtNumber(Math.round(totalReduction))} kg`, label: `Totaal over ${data.financials.years} jaar`, variant: 'green' },
      { value: fmtNumber(Math.round(totalTrees)), label: 'Bomen-equivalent', variant: 'green' },
    ]),

    createElement(Text, { style: styles.text },
      'Batterijopslag draagt bij aan CO\u2082-reductie door optimaal gebruik van groene stroom ' +
      'en vermindering van netbelasting tijdens piekuren.'
    ),

    createElement(Text, { style: styles.sectionTitle }, 'CO\u2082-reductie per jaar'),
    createTable(headers, rows),

    createElement(Text, { style: { ...styles.textSmall, marginTop: 8 } },
      'Berekend op basis van de gemiddelde CO\u2082-intensiteit van het Nederlandse elektriciteitsnet (0,4 kg CO\u2082/kWh). ' +
      'Bomen-equivalent: 1 boom absorbeert circa 22 kg CO\u2082 per jaar.'
    ),

    createFooter(reportDate),
  );
}
