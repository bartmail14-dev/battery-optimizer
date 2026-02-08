import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import { createElement } from 'react';
import type { CalculationResult, BatteryConfig, EnergyProfile, FinancialParams, ScenarioResult } from '../types';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1f2937',
  },
  header: {
    marginBottom: 20,
    borderBottom: '2 solid #2563eb',
    paddingBottom: 10,
  },
  brandName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  brandSub: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#1e3a5f',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 6,
    color: '#374151',
  },
  text: {
    fontSize: 10,
    lineHeight: 1.5,
    marginBottom: 4,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    gap: 10,
  },
  metricBox: {
    flex: 1,
    backgroundColor: '#f0f9ff',
    borderRadius: 6,
    padding: 12,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  metricLabel: {
    fontSize: 8,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  table: {
    marginTop: 10,
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1 solid #e5e7eb',
    paddingVertical: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottom: '2 solid #374151',
    paddingVertical: 4,
    fontWeight: 'bold',
  },
  tableCell: {
    flex: 1,
    fontSize: 9,
    paddingHorizontal: 4,
  },
  tableCellRight: {
    flex: 1,
    fontSize: 9,
    paddingHorizontal: 4,
    textAlign: 'right',
  },
  disclaimer: {
    marginTop: 30,
    padding: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 6,
    fontSize: 8,
    color: '#92400e',
    lineHeight: 1.4,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 7,
    color: '#9ca3af',
    textAlign: 'center',
    borderTop: '1 solid #e5e7eb',
    paddingTop: 8,
  },
  ctaPage: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 20,
    textAlign: 'center',
  },
  ctaText: {
    fontSize: 12,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 1.6,
  },
  ctaContact: {
    marginTop: 30,
    padding: 20,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
});

function fmtEuro(n: number): string {
  if (!isFinite(n)) return '—';
  return `€ ${n.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtYears(n: number): string {
  if (!isFinite(n)) return '> 20 jaar';
  return `${n.toFixed(1)} jaar`;
}

function fmtPct(n: number): string {
  if (!isFinite(n)) return '—';
  return `${(n * 100).toFixed(1)}%`;
}

const SCENARIO_LABELS: Record<string, string> = {
  optimistic: 'Optimistisch',
  base: 'Basis',
  pessimistic: 'Pessimistisch',
};

interface ReportData {
  results: CalculationResult;
  battery: BatteryConfig;
  profile: EnergyProfile;
  financials: FinancialParams;
  aiReport?: string;
}

function ReportDocument({ results, battery, profile, financials, aiReport }: ReportData) {
  const totalInvestment = results.grossInvestment;

  return createElement(Document, null,
    // Page 1: Summary
    createElement(Page, { size: 'A4', style: styles.page },
      createElement(View, { style: styles.header },
        createElement(Text, { style: styles.brandName }, 'COMCAM'),
        createElement(Text, { style: styles.brandSub }, 'Energieconsultancy — Battery Optimizer Rapport'),
      ),

      createElement(Text, { style: styles.title }, 'Investeringsanalyse Batterijopslag'),

      createElement(Text, { style: styles.text },
        `Sector: ${profile.sector} | ` +
        `Jaarverbruik: ${(profile.annualConsumptionKwh / 1000).toFixed(0)} MWh | ` +
        `Batterij: ${battery.capacityKwh} kWh / ${battery.powerKw} kW`
      ),

      // Key metrics
      createElement(View, { style: styles.metricsRow },
        createElement(View, { style: styles.metricBox },
          createElement(Text, { style: styles.metricValue }, fmtEuro(results.annualSavings)),
          createElement(Text, { style: styles.metricLabel }, 'Jaarlijkse besparing'),
        ),
        createElement(View, { style: styles.metricBox },
          createElement(Text, { style: styles.metricValue }, fmtYears(results.simplePayback)),
          createElement(Text, { style: styles.metricLabel }, 'Terugverdientijd'),
        ),
        createElement(View, { style: styles.metricBox },
          createElement(Text, { style: styles.metricValue }, fmtEuro(results.npv)),
          createElement(Text, { style: styles.metricLabel }, 'Netto Contante Waarde'),
        ),
        createElement(View, { style: styles.metricBox },
          createElement(Text, { style: styles.metricValue }, fmtPct(results.irr)),
          createElement(Text, { style: styles.metricLabel }, 'Rendement (IRR)'),
        ),
      ),

      // Scenario comparison
      createElement(Text, { style: styles.subtitle }, 'Scenariovergelijking'),
      createElement(View, { style: styles.table },
        createElement(View, { style: styles.tableHeader },
          createElement(Text, { style: styles.tableCell }, 'Scenario'),
          createElement(Text, { style: styles.tableCellRight }, 'NPV'),
          createElement(Text, { style: styles.tableCellRight }, 'Terugverdientijd'),
          createElement(Text, { style: styles.tableCellRight }, 'Jaarlijkse besparing'),
        ),
        ...results.scenarioResults.map((s: ScenarioResult) =>
          createElement(View, { style: styles.tableRow, key: s.scenario },
            createElement(Text, { style: styles.tableCell }, SCENARIO_LABELS[s.scenario] ?? s.scenario),
            createElement(Text, { style: styles.tableCellRight }, fmtEuro(s.npv)),
            createElement(Text, { style: styles.tableCellRight }, fmtYears(s.simplePayback)),
            createElement(Text, { style: styles.tableCellRight }, fmtEuro(s.annualSavings)),
          )
        ),
      ),

      // Assumptions
      createElement(Text, { style: styles.subtitle }, 'Aannames'),
      createElement(View, { style: styles.table },
        ...[
          ['Totale investering', fmtEuro(totalInvestment)],
          ['Batterij levensduur', `${battery.lifespanYears} jaar`],
          ['Round-trip efficiency', fmtPct(battery.roundTripEfficiency)],
          ['Jaarlijkse degradatie', fmtPct(battery.annualDegradation)],
          ['Discontovoet (WACC)', fmtPct(financials.discountRate)],
          ['Energieprijsstijging', `${(financials.electricityPriceGrowthRate * 100).toFixed(1)}% per jaar`],
          ['Analyseperiode', `${financials.years} jaar`],
          ['Jaarlijks onderhoud', fmtEuro(battery.annualMaintenanceCost)],
        ].map(([label, value]) =>
          createElement(View, { style: styles.tableRow, key: label },
            createElement(Text, { style: styles.tableCell }, label),
            createElement(Text, { style: styles.tableCellRight }, value),
          )
        ),
      ),

      createElement(View, { style: styles.disclaimer },
        createElement(Text, null,
          'Deze analyse is indicatief en gebaseerd op de ingevoerde parameters en marktaannames. ' +
          'Werkelijke resultaten kunnen afwijken door marktomstandigheden, regelgeving en technische factoren. ' +
          'Neem contact op met COMCAM voor een maatwerkadvies.'
        ),
      ),

      createElement(Text, { style: styles.footer },
        `Battery Optimizer — COMCAM Energieconsultancy — ${new Date().toLocaleDateString('nl-NL')}`
      ),
    ),

    // Page 2: AI-generated report (if available)
    ...(aiReport ? [
      createElement(Page, { size: 'A4', style: styles.page, key: 'ai-report' },
        createElement(View, { style: styles.header },
          createElement(Text, { style: styles.brandName }, 'COMCAM'),
          createElement(Text, { style: styles.brandSub }, 'Directierapport'),
        ),
        createElement(Text, { style: styles.title }, 'Analyse & Aanbeveling'),
        createElement(Text, { style: { ...styles.text, lineHeight: 1.6 } }, aiReport),
        createElement(Text, { style: styles.footer },
          `Battery Optimizer — COMCAM Energieconsultancy — ${new Date().toLocaleDateString('nl-NL')}`
        ),
      ),
    ] : []),

    // Last page: CTA
    createElement(Page, { size: 'A4', style: { ...styles.page, ...styles.ctaPage } },
      createElement(Text, { style: styles.ctaTitle }, 'Klaar voor de volgende stap?'),
      createElement(Text, { style: styles.ctaText },
        'Deze analyse geeft een eerste indicatie van het potentieel van batterijopslag voor uw organisatie.'
      ),
      createElement(Text, { style: styles.ctaText },
        'COMCAM helpt u graag verder met een maatwerkadvies, inclusief:'
      ),
      createElement(Text, { style: { ...styles.ctaText, textAlign: 'left', marginLeft: 60 } },
        '• Gedetailleerde analyse op basis van uw werkelijke verbruiksdata\n' +
        '• Leveranciersselectie en offertevergelijking\n' +
        '• Subsidieaanvraag (SDE++, EIA)\n' +
        '• Projectbegeleiding van ontwerp tot oplevering'
      ),
      createElement(View, { style: styles.ctaContact },
        createElement(Text, { style: { fontSize: 14, fontWeight: 'bold', color: '#2563eb', marginBottom: 8 } }, 'COMCAM Energieconsultancy'),
        createElement(Text, { style: styles.ctaText }, 'info@comcam.nl'),
        createElement(Text, { style: styles.ctaText }, 'www.comcam.nl'),
      ),
    ),
  );
}

/**
 * Generates a PDF blob from the calculation results.
 */
export async function generatePDF(data: ReportData): Promise<Blob> {
  // @react-pdf/renderer types don't align perfectly with React 19 createElement
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc = createElement(ReportDocument, data) as any;
  return await pdf(doc).toBlob();
}

/**
 * Generates and downloads the PDF report.
 */
export async function downloadPDF(data: ReportData): Promise<void> {
  const blob = await generatePDF(data);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `COMCAM-Battery-Optimizer-Rapport-${new Date().toISOString().slice(0, 10)}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
