import { Page, Text, View } from '@react-pdf/renderer';
import { createElement } from 'react';
import { styles, fmtEuro, fmtNumber, fmtKwh, MONTH_LABELS } from '../styles';
import { createHeader } from '../components/pdf-header';
import { createFooter } from '../components/pdf-footer';
import { createTable } from '../components/pdf-table';
import { createKeyValueTable } from '../components/pdf-table';
import type { FullReportData } from '../../../types';

export function createOperationalProfile(data: FullReportData, pageNum: number, totalPages: number) {
  const { results, profile } = data;
  const reportDate = data.config.reportDate ?? new Date().toLocaleDateString('nl-NL');

  // Monthly table
  const monthHeaders = ['Maand', 'Zonder batterij', 'Met batterij', 'Besparing', 'Cycli'];
  const monthRows = results.monthlyBreakdown.map((m, i) => [
    MONTH_LABELS[i] ?? m.label,
    fmtEuro(m.costWithout),
    fmtEuro(m.costWith),
    fmtEuro(m.savings),
    fmtNumber(m.cycles),
  ]);

  // Grid independence
  const sim = results.simulation;
  const totalGridImport = sim.hourlyResults.reduce((sum, h) => sum + h.gridImport, 0);
  const gridIndependence = 1 - (totalGridImport / profile.annualConsumptionKwh);

  return createElement(Page, { size: 'A4', style: styles.page },
    createHeader('Operationeel Profiel', pageNum, totalPages),

    createElement(Text, { style: styles.pageTitle }, 'Operationeel Profiel'),

    createElement(Text, { style: styles.sectionTitle }, 'Overzicht'),
    createKeyValueTable([
      ['Jaarverbruik', fmtKwh(profile.annualConsumptionKwh)],
      ['Piekvraag', `${fmtNumber(profile.peakDemandKw)} kW`],
      ['Piekreductie', `${fmtNumber(results.peakReductionKw, 1)} kW`],
      ['Grid-onafhankelijkheid', `${(gridIndependence * 100).toFixed(1)}%`],
      ['Totaal geladen', fmtKwh(sim.totalCharged)],
      ['Totaal ontladen', fmtKwh(sim.totalDischarged)],
      ['Totaal cycli (jaar 1)', fmtNumber(sim.totalCycles)],
    ]),

    createElement(Text, { style: styles.sectionTitle }, 'Maandelijks overzicht'),
    createTable(monthHeaders, monthRows),

    createElement(View, { style: styles.disclaimer },
      createElement(Text, null,
        'Indicatief \u2014 maandelijkse verdeling is gebaseerd op het synthetisch of ge\u00fcpload verbruiksprofiel. Werkelijk operationeel profiel hangt af van seizoenspatronen.'
      ),
    ),

    createFooter(reportDate),
  );
}
