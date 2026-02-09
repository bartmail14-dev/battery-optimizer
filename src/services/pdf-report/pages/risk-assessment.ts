import { Page, Text, View } from '@react-pdf/renderer';
import { createElement } from 'react';
import { styles, fmtEuro, fmtYears, fmtPct } from '../styles';
import { createHeader } from '../components/pdf-header';
import { createFooter } from '../components/pdf-footer';
import type { FullReportData, ScenarioResult } from '../../../types';

export function createRiskAssessment(data: FullReportData, pageNum: number, totalPages: number) {
  const { results, profile } = data;
  const reportDate = data.config.reportDate ?? new Date().toLocaleDateString('nl-NL');

  const pessimistic = results.scenarioResults.find((s: ScenarioResult) => s.scenario === 'pessimistic');
  const dataSource = profile.dataSource ?? 'synthetic';
  const dataQuality = dataSource === 'csv' ? 'Hoog' : 'Matig';
  const dataQualityColor = dataSource === 'csv' ? '#16a34a' : '#d97706';

  return createElement(Page, { size: 'A4', style: styles.page },
    createHeader('Risicobeoordeling', pageNum, totalPages),

    createElement(Text, { style: styles.pageTitle }, 'Risicobeoordeling'),

    // Data quality
    createElement(Text, { style: styles.sectionTitle }, 'Datakwaliteit'),
    createElement(View, {
      style: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
      },
    },
      createElement(View, {
        style: {
          backgroundColor: dataQualityColor,
          borderRadius: 4,
          paddingHorizontal: 8,
          paddingVertical: 3,
        },
      },
        createElement(Text, { style: { fontSize: 9, color: '#ffffff', fontWeight: 'bold' } }, dataQuality),
      ),
      createElement(Text, { style: styles.text },
        dataSource === 'csv'
          ? 'Berekening is gebaseerd op werkelijke verbruiksdata (CSV-upload).'
          : 'Berekening is gebaseerd op een synthetisch verbruiksprofiel. Upload werkelijke data voor een nauwkeuriger resultaat.'
      ),
    ),

    // Sector benchmark
    createElement(Text, { style: styles.sectionTitle }, 'Sectorbenchmark'),
    createElement(Text, { style: styles.text },
      `Sector: ${profile.sector}. De terugverdientijd van ${fmtYears(results.simplePayback)} ` +
      `${results.simplePayback <= 7 ? 'valt binnen' : 'valt buiten'} de gebruikelijke bandbreedte voor deze sector (5-8 jaar).`
    ),

    // Worst case
    createElement(Text, { style: styles.sectionTitle }, 'Worst-case scenario'),
    pessimistic
      ? createElement(View, {
          style: {
            backgroundColor: pessimistic.npv < 0 ? '#fef2f2' : '#f0fdf4',
            borderRadius: 6,
            padding: 10,
            marginTop: 4,
          },
        },
          createElement(Text, { style: { fontSize: 10, fontWeight: 'bold', marginBottom: 4 } },
            `Pessimistisch scenario: NPV ${fmtEuro(pessimistic.npv)}`
          ),
          createElement(Text, { style: styles.text },
            `In het pessimistische scenario is de terugverdientijd ${fmtYears(pessimistic.simplePayback)} ` +
            `met een IRR van ${fmtPct(pessimistic.irr)}. ` +
            (pessimistic.npv < 0
              ? 'In dit scenario is de investering niet rendabel. Overweeg risicomitigerende maatregelen.'
              : 'Ook in dit scenario blijft de investering rendabel.')
          ),
        )
      : null,

    // Payback confidence
    createElement(Text, { style: styles.sectionTitle }, 'Terugverdienkans'),
    createElement(Text, { style: styles.text },
      `Bandbreedte: ${fmtYears(results.paybackConfidence.optimistic)} tot ${fmtYears(results.paybackConfidence.pessimistic)}. ` +
      `Betrouwbaarheid: ${results.paybackConfidence.confidence}.`
    ),

    // Key risks
    createElement(Text, { style: styles.sectionTitle }, 'Belangrijkste risico\'s'),
    createElement(Text, { style: styles.text }, '\u2022 Energieprijsontwikkeling: afwijkingen van de aangenomen prijsstijging be\u00EFnvloeden de besparingen direct.'),
    createElement(Text, { style: styles.text }, '\u2022 Batterijdegradatie: versnelde degradatie vermindert de beschikbare capaciteit en besparingen.'),
    createElement(Text, { style: styles.text }, '\u2022 Subsidiewijzigingen: wijzigingen in SDE++ of EIA voorwaarden kunnen het rendement be\u00EFnvloeden.'),
    createElement(Text, { style: styles.text }, '\u2022 Technologische veranderingen: dalende batterijprijzen kunnen de timing van investering be\u00EFnvloeden.'),

    createElement(View, { style: styles.disclaimer },
      createElement(Text, null,
        'Deze risicobeoordeling is indicatief. Raadpleeg een specialist voor een uitgebreide due diligence.'
      ),
    ),

    createFooter(reportDate),
  );
}
