import { Page, Text, View } from '@react-pdf/renderer';
import { createElement } from 'react';
import { styles } from '../styles';
import { createHeader } from '../components/pdf-header';
import { createFooter } from '../components/pdf-footer';

export function createAiAnalysisPage(aiText: string, reportDate: string, pageNum: number, totalPages: number) {
  return createElement(Page, { size: 'A4', style: styles.page },
    createHeader('AI Analyse', pageNum, totalPages),

    createElement(Text, { style: styles.pageTitle }, 'Analyse & Aanbeveling'),

    createElement(Text, { style: { ...styles.text, lineHeight: 1.6 } }, aiText),

    createElement(View, { style: styles.disclaimer },
      createElement(Text, null,
        'Dit gedeelte is gegenereerd door een AI-model op basis van de berekende resultaten. ' +
        'De analyse dient als aanvulling op, niet als vervanging van, professioneel advies.'
      ),
    ),

    createFooter(reportDate),
  );
}
