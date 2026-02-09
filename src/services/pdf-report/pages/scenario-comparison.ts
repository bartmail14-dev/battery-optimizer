import { Page, Text, View } from '@react-pdf/renderer';
import { createElement } from 'react';
import { styles, fmtEuro, fmtYears, fmtPct, SCENARIO_LABELS } from '../styles';
import { createHeader } from '../components/pdf-header';
import { createFooter } from '../components/pdf-footer';
import { createTable } from '../components/pdf-table';
import type { FullReportData, ScenarioResult } from '../../../types';

export function createScenarioPage(data: FullReportData, pageNum: number, totalPages: number) {
  const { results } = data;
  const reportDate = data.config.reportDate ?? new Date().toLocaleDateString('nl-NL');

  const headers = ['Scenario', 'NPV', 'IRR', 'Terugverdientijd', 'Jaarbesparing', 'LCOS'];

  const rows = results.scenarioResults.map((s: ScenarioResult) => [
    SCENARIO_LABELS[s.scenario] ?? s.scenario,
    fmtEuro(s.npv),
    fmtPct(s.irr),
    fmtYears(s.simplePayback),
    fmtEuro(s.annualSavings),
    `${fmtEuro(s.lcos)}/kWh`,
  ]);

  // Payback confidence
  const pc = results.paybackConfidence;
  const confidenceLabels: Record<string, string> = {
    hoog: 'Hoog',
    midden: 'Midden',
    laag: 'Laag',
  };

  return createElement(Page, { size: 'A4', style: styles.page },
    createHeader('Scenariovergelijking', pageNum, totalPages),

    createElement(Text, { style: styles.pageTitle }, 'Scenariovergelijking'),

    createElement(Text, { style: styles.text },
      'Drie scenario\'s modelleren de onzekerheid in energieprijzen, degradatie en effici\u00EBntie. ' +
      'Het basisscenario gebruikt de opgegeven parameters. Het optimistische en pessimistische scenario ' +
      'variëren deze met respectievelijk +20% en -20%.'
    ),

    createTable(headers, rows),

    // Payback confidence band
    createElement(Text, { style: styles.sectionTitle }, 'Terugverdienkans'),
    createElement(View, {
      style: {
        backgroundColor: pc.confidence === 'hoog' ? '#f0fdf4' : pc.confidence === 'midden' ? '#fef3c7' : '#fef2f2',
        borderRadius: 6,
        padding: 10,
        marginTop: 6,
      },
    },
      createElement(Text, {
        style: { fontSize: 12, fontWeight: 'bold', color: '#374151', marginBottom: 4 },
      }, `Betrouwbaarheid: ${confidenceLabels[pc.confidence] ?? pc.confidence}`),
      createElement(Text, { style: styles.text },
        `De terugverdientijd varieert van ${fmtYears(pc.optimistic)} (optimistisch) tot ${fmtYears(pc.pessimistic)} (pessimistisch), ` +
        `een bandbreedte van ${pc.rangeYears.toFixed(1)} jaar. ` +
        (pc.confidence === 'hoog'
          ? 'De smalle bandbreedte duidt op een robuuste investering.'
          : pc.confidence === 'midden'
          ? 'De matige bandbreedte suggereert dat de investering gevoelig is voor marktomstandigheden.'
          : 'De brede bandbreedte duidt op aanzienlijke onzekerheid. Nader onderzoek wordt aanbevolen.')
      ),
    ),

    createElement(View, { style: styles.disclaimer },
      createElement(Text, null,
        'Scenario\'s zijn gebaseerd op parameterwijzigingen van \u00B120%. ' +
        'Werkelijke variatie kan groter of kleiner zijn afhankelijk van specifieke marktomstandigheden.'
      ),
    ),

    createFooter(reportDate),
  );
}
