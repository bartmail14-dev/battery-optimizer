import { Page, Text, View } from '@react-pdf/renderer';
import { createElement } from 'react';
import { styles, fmtEuro } from '../styles';
import { createHeader } from '../components/pdf-header';
import { createFooter } from '../components/pdf-footer';
import { createTable } from '../components/pdf-table';
import type { FullReportData } from '../../../types';

export function createSensitivityPage(data: FullReportData, pageNum: number, totalPages: number) {
  const { sensitivity } = data;
  const reportDate = data.config.reportDate ?? new Date().toLocaleDateString('nl-NL');

  const headers = ['Variabele', 'Laag', 'Basis', 'Hoog', 'Eenheid'];

  const rows = sensitivity.map((s) => [
    s.label,
    fmtEuro(s.lowNpv),
    fmtEuro(s.baseNpv),
    fmtEuro(s.highNpv),
    s.unit,
  ]);

  // Find worst case
  const worstCase = sensitivity.reduce((worst, s) => {
    const minNpv = Math.min(s.lowNpv, s.highNpv);
    return minNpv < worst.npv ? { variable: s.label, npv: minNpv } : worst;
  }, { variable: '', npv: Infinity });

  return createElement(Page, { size: 'A4', style: styles.page },
    createHeader('Gevoeligheidsanalyse', pageNum, totalPages),

    createElement(Text, { style: styles.pageTitle }, 'Gevoeligheidsanalyse'),

    createElement(Text, { style: styles.text },
      'De gevoeligheidsanalyse toont het effect van individuele parametervariaties op de NPV. ' +
      'Elke variabele wordt gevarieerd terwijl alle andere parameters op de basiswaarde blijven.'
    ),

    createElement(Text, { style: styles.sectionTitle }, 'Sensitivity Matrix (NPV per variabele)'),
    createTable(headers, rows),

    // Worst case
    createElement(Text, { style: styles.sectionTitle }, 'Worst-case analyse'),
    createElement(View, {
      style: {
        backgroundColor: '#fef2f2',
        borderRadius: 6,
        padding: 10,
        marginTop: 4,
      },
    },
      createElement(Text, { style: { fontSize: 10, fontWeight: 'bold', color: '#dc2626', marginBottom: 4 } },
        `Meest gevoelige variabele: ${worstCase.variable}`
      ),
      createElement(Text, { style: styles.text },
        `In het slechtste geval daalt de NPV tot ${fmtEuro(worstCase.npv)}. ` +
        (worstCase.npv < 0
          ? 'Dit scenario resulteert in een negatief rendement. Risicomitigatie wordt aanbevolen.'
          : 'Ook in dit scenario blijft de investering rendabel.')
      ),
    ),

    createElement(View, { style: styles.disclaimer },
      createElement(Text, null,
        'De gevoeligheidsanalyse is eendimensionaal: slechts \u00E9\u00E9n variabele wordt per keer gevarieerd. ' +
        'In werkelijkheid kunnen meerdere variabelen gelijktijdig afwijken.'
      ),
    ),

    createFooter(reportDate),
  );
}
