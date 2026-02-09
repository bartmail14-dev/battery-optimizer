import { Page, Text, View } from '@react-pdf/renderer';
import { createElement } from 'react';
import { styles, fmtEuro } from '../styles';
import { createHeader } from '../components/pdf-header';
import { createFooter } from '../components/pdf-footer';
import { createTable } from '../components/pdf-table';
import type { FullReportData } from '../../../types';

export function createRevenueSourcesPage(data: FullReportData, pageNum: number, totalPages: number) {
  const { results } = data;
  const reportDate = data.config.reportDate ?? new Date().toLocaleDateString('nl-NL');

  const headers = ['Jaar', 'Arbitrage', 'Piekverlaging', 'SDE++', 'Onderhoud', 'Netto'];

  const rows = results.yearlyRevenueBreakdown.map((y) => [
    `Jaar ${y.year}`,
    fmtEuro(y.arbitrageSavings),
    fmtEuro(y.peakShavingSavings),
    fmtEuro(y.sdeSubsidy),
    fmtEuro(-y.maintenanceCost),
    fmtEuro(y.netRevenue),
  ]);

  return createElement(Page, { size: 'A4', style: styles.page },
    createHeader('Omzetbronnen', pageNum, totalPages),

    createElement(Text, { style: styles.pageTitle }, 'Omzetbronnen per Jaar'),

    createElement(Text, { style: styles.text },
      'Onderstaande tabel toont de opbrengsten per bron per jaar. ' +
      'Arbitrage- en piekverlagingsbesparingen worden gecorrigeerd voor batterijdegradatie en energieprijsstijging. ' +
      'SDE++ subsidie loopt maximaal 15 jaar.'
    ),

    createTable(headers, rows),

    createElement(View, { style: styles.disclaimer },
      createElement(Text, null,
        'Indicatief \u2014 opbrengsten zijn gecorrigeerd voor batterijdegradatie en energieprijsstijging. Werkelijke bedragen hangen af van marktprijzen en verbruikspatroon.'
      ),
    ),

    createFooter(reportDate),
  );
}
