import { Page, Text, View } from '@react-pdf/renderer';
import { createElement } from 'react';
import { styles } from '../styles';
import type { PdfReportConfig } from '../../../types';

export function createCoverPage(config: PdfReportConfig) {
  const reportDate = config.reportDate ?? new Date().toLocaleDateString('nl-NL', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return createElement(Page, { size: 'A4', style: { ...styles.page, ...styles.coverPage } },
    createElement(Text, { style: styles.coverBrand }, 'COMCAM'),
    createElement(Text, { style: styles.coverSubtitle }, 'Energieconsultancy'),
    createElement(View, { style: { marginTop: 40 } },
      createElement(Text, { style: styles.coverTitle }, 'Investeringsanalyse\nBatterijopslag'),
      createElement(Text, { style: styles.coverMeta }, config.clientName),
      config.projectRef
        ? createElement(Text, { style: styles.coverMeta }, `Referentie: ${config.projectRef}`)
        : null,
      createElement(Text, { style: styles.coverMeta }, reportDate),
      config.consultantName
        ? createElement(Text, { style: styles.coverMeta }, `Consultant: ${config.consultantName}`)
        : null,
    ),
    createElement(View, { style: styles.coverConfidential },
      createElement(Text, null, 'VERTROUWELIJK \u2014 Dit rapport is uitsluitend bestemd voor de geadresseerde.'),
    ),
  );
}
