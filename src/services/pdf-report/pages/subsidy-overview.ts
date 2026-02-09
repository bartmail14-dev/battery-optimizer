import { Page, Text, View } from '@react-pdf/renderer';
import { createElement } from 'react';
import { styles, fmtEuro, fmtPct, fmtYears } from '../styles';
import { createHeader } from '../components/pdf-header';
import { createFooter } from '../components/pdf-footer';
import { createTable } from '../components/pdf-table';
import { createKeyValueTable } from '../components/pdf-table';
import type { FullReportData } from '../../../types';

export function createSubsidyOverview(data: FullReportData, pageNum: number, totalPages: number) {
  const { results, subsidies } = data;
  const reportDate = data.config.reportDate ?? new Date().toLocaleDateString('nl-NL');

  // Subsidy schedule table
  const schedHeaders = ['Jaar', 'SDE++', 'EIA', 'Totaal', 'SDE actief'];
  const schedRows = results.subsidySchedule.map((s) => [
    `Jaar ${s.year}`,
    fmtEuro(s.sdeAmount),
    fmtEuro(s.eiaAmount),
    fmtEuro(s.totalSubsidy),
    s.isSdeActive ? 'Ja' : 'Nee',
  ]);

  return createElement(Page, { size: 'A4', style: styles.page },
    createHeader('Subsidie-overzicht', pageNum, totalPages),

    createElement(Text, { style: styles.pageTitle }, 'Subsidie-overzicht'),

    createElement(Text, { style: styles.sectionTitle }, 'Subsidie-instellingen'),
    createKeyValueTable([
      ['SDE++ geschikt', subsidies.sdeEligible ? 'Ja' : 'Nee'],
      ['SDE++ basisbedrag', `${fmtEuro(subsidies.sdeBaseAmount)}/kWh`],
      ['EIA percentage', fmtPct(subsidies.eiaPercentage)],
      ['EIA maximale aftrek', fmtEuro(subsidies.eiaMaxDeduction)],
    ]),

    createElement(Text, { style: styles.sectionTitle }, 'Subsidie-impact'),
    createKeyValueTable([
      ['NPV met subsidie', fmtEuro(results.npv)],
      ['NPV zonder subsidie', fmtEuro(results.noSubsidyNpv)],
      ['Subsidie-impact', fmtEuro(results.subsidyImpactEur)],
      ['Terugverdientijd met subsidie', fmtYears(results.simplePayback)],
      ['Terugverdientijd zonder subsidie', fmtYears(results.noSubsidyPayback)],
    ]),

    createElement(Text, { style: styles.sectionTitle }, 'Subsidie-schema (15 jaar)'),
    createTable(schedHeaders, schedRows),

    createElement(View, { style: styles.disclaimer },
      createElement(Text, null,
        'Indicatief \u2014 subsidie-impact is gebaseerd op het basisscenario. Werkelijke subsidiebedragen hangen af van toekenning en regelgeving.'
      ),
    ),

    createFooter(reportDate),
  );
}
