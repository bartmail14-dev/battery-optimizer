import { Page, Text, View } from '@react-pdf/renderer';
import { createElement } from 'react';
import { styles, fmtEuro, fmtYears, fmtPct } from '../styles';
import { createHeader } from '../components/pdf-header';
import { createFooter } from '../components/pdf-footer';
import { createMetricsRow } from '../components/pdf-metric-box';
import type { FullReportData } from '../../../types';

export function createManagementSummary(data: FullReportData, pageNum: number, totalPages: number) {
  const { results } = data;
  const reportDate = data.config.reportDate ?? new Date().toLocaleDateString('nl-NL');
  const wacc = data.financials.discountRate;
  const maxPayback = 10; // METRIC_THRESHOLDS.payback.maxAcceptable
  type Verdict = 'positief' | 'aandachtspunten' | 'negatief';
  let verdict: Verdict = 'positief';
  if (results.npv < 0) verdict = 'negatief';
  else if (results.simplePayback > maxPayback || results.irr < wacc) verdict = 'aandachtspunten';

  const verdictLabels: Record<Verdict, string> = { positief: 'POSITIEF ADVIES', aandachtspunten: 'AANDACHTSPUNTEN', negatief: 'NEGATIEF ADVIES' };
  const verdictColors: Record<Verdict, { bg: string; text: string }> = {
    positief: { bg: '#f0fdf4', text: '#16a34a' },
    aandachtspunten: { bg: '#fffbeb', text: '#d97706' },
    negatief: { bg: '#fef2f2', text: '#dc2626' },
  };
  const isPositive = verdict === 'positief';
  const verdictColor = verdictColors[verdict].text;

  return createElement(Page, { size: 'A4', style: styles.page },
    createHeader('Management Samenvatting', pageNum, totalPages),

    createElement(Text, { style: styles.pageTitle }, 'Management Samenvatting'),

    // Go/No-Go verdict
    createElement(View, {
      style: {
        backgroundColor: verdictColors[verdict].bg,
        borderRadius: 6,
        padding: 12,
        marginBottom: 12,
        alignItems: 'center',
      },
    },
      createElement(Text, {
        style: { fontSize: 20, fontWeight: 'bold', color: verdictColor },
      }, verdictLabels[verdict]),
      createElement(Text, {
        style: { fontSize: 9, color: '#6b7280', marginTop: 4 },
      }, verdict === 'positief'
        ? 'De investering genereert positief rendement binnen de analyseperiode.'
        : verdict === 'aandachtspunten'
        ? 'De investering is positief maar er zijn aandachtspunten (terugverdientijd of rendement).'
        : 'De investering genereert onvoldoende rendement binnen de analyseperiode.'
      ),
    ),

    // 4 key metrics
    createMetricsRow([
      { value: fmtEuro(results.npv), label: 'Netto Contante Waarde', variant: isPositive ? 'green' : 'red' },
      { value: fmtPct(results.irr), label: 'Rendement (IRR)' },
      { value: fmtYears(results.simplePayback), label: 'Terugverdientijd' },
      { value: fmtEuro(results.annualSavings), label: 'Jaarlijkse besparing' },
    ]),

    // Investment thesis
    createElement(Text, { style: styles.sectionTitle }, 'Investeringsthesis'),
    createElement(Text, { style: styles.text },
      isPositive
        ? `Een batterijopslagsysteem van ${data.battery.capacityKwh} kWh met ${data.battery.powerKw} kW vermogen ` +
          `levert een netto contante waarde van ${fmtEuro(results.npv)} over ${data.financials.years} jaar. ` +
          `De investering van ${fmtEuro(results.grossInvestment)} wordt terugverdiend in ${fmtYears(results.simplePayback)}. ` +
          `Het systeem realiseert een jaarlijkse besparing van ${fmtEuro(results.annualSavings)} door een combinatie van ` +
          `energiearbitrage, piekverlaging en subsidie-inkomsten.`
        : `Een batterijopslagsysteem van ${data.battery.capacityKwh} kWh voldoet op basis van de huidige aannames niet ` +
          `aan de rendementseisen. De netto contante waarde is ${fmtEuro(results.npv)} over ${data.financials.years} jaar. ` +
          `Overweeg alternatieve configuraties of wacht op gunstigere marktomstandigheden.`
    ),

    // Key facts
    createElement(Text, { style: styles.sectionTitle }, 'Kerngegevens'),
    createElement(View, { style: styles.table },
      ...[
        ['Sector', data.profile.sector],
        ['Jaarverbruik', `${(data.profile.annualConsumptionKwh / 1000).toFixed(0)} MWh`],
        ['Bruto investering', fmtEuro(results.grossInvestment)],
        ['Netto investering (na EIA)', fmtEuro(results.netInvestment)],
        ['CO\u2082-reductie', `${Math.round(results.co2ReductionKg).toLocaleString('nl-NL')} kg/jaar`],
      ].map(([label, value], i) =>
        createElement(View, { style: styles.kvRow, key: `kv-${i}` },
          createElement(Text, { style: styles.kvLabel }, label),
          createElement(Text, { style: styles.kvValue }, value),
        )
      ),
    ),

    createFooter(reportDate),
  );
}
