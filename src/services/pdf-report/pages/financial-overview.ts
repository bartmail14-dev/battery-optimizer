import { Page, Text, View } from '@react-pdf/renderer';
import { createElement } from 'react';
import { styles, fmtEuro, fmtYears, fmtPct } from '../styles';
import { createHeader } from '../components/pdf-header';
import { createFooter } from '../components/pdf-footer';
import { createKeyValueTable } from '../components/pdf-table';
import { createTable } from '../components/pdf-table';
import type { FullReportData } from '../../../types';

export function createFinancialOverview(data: FullReportData, pageNum: number, totalPages: number) {
  const { results, battery, financials } = data;
  const reportDate = data.config.reportDate ?? new Date().toLocaleDateString('nl-NL');

  return createElement(Page, { size: 'A4', style: styles.page },
    createHeader('Financieel Overzicht', pageNum, totalPages),

    createElement(Text, { style: styles.pageTitle }, 'Financieel Overzicht'),

    // Investment breakdown
    createElement(Text, { style: styles.sectionTitle }, 'Investeringsoverzicht'),
    createKeyValueTable([
      ['Batterijkosten', fmtEuro(battery.capacityKwh * battery.costPerKwh)],
      ['Installatiekosten', fmtEuro(battery.installationCost)],
      ['Bruto investering', fmtEuro(results.grossInvestment)],
      ['EIA voordeel', fmtEuro(-(results.grossInvestment - results.netInvestment))],
      ['Netto investering', fmtEuro(results.netInvestment)],
    ]),

    // Revenue sources
    createElement(Text, { style: styles.sectionTitle }, 'Opbrengstbronnen (jaar 1)'),
    createKeyValueTable([
      ['Energiearbitrage', fmtEuro(results.arbitrageSavings)],
      ['Piekverlaging', fmtEuro(results.peakShavingSavings)],
      ['SDE++ subsidie', fmtEuro(results.annualSubsidy)],
      ['Onderhoud', fmtEuro(-battery.annualMaintenanceCost)],
      ['Netto jaarlijkse besparing', fmtEuro(results.annualSavings)],
    ]),

    // Key financial metrics
    createElement(Text, { style: styles.sectionTitle }, 'Financi\u00eble kengetallen'),
    createKeyValueTable([
      ['Netto Contante Waarde (NPV)', fmtEuro(results.npv)],
      ['Internal Rate of Return (IRR)', fmtPct(results.irr)],
      ['Terugverdientijd (simpel)', fmtYears(results.simplePayback)],
      ['Terugverdientijd (verdisconteerd)', fmtYears(results.discountedPayback)],
      ['LCOS', `${fmtEuro(results.lcos)}/kWh`],
      ['Totale besparing', fmtEuro(results.totalSavings)],
      ['Discontovoet (WACC)', fmtPct(financials.discountRate)],
    ]),

    createElement(View, { style: styles.disclaimer },
      createElement(Text, null,
        'Alle bedragen zijn exclusief BTW. De berekening is gebaseerd op de opgegeven parameters en marktaannames.'
      ),
    ),

    createFooter(reportDate),
  );
}

export function createDcfPage(data: FullReportData, pageNum: number, totalPages: number) {
  const { results } = data;
  const reportDate = data.config.reportDate ?? new Date().toLocaleDateString('nl-NL');

  const headers = ['Jaar', 'Bruto besp.', 'Onderhoud', 'Subsidie', 'Netto CF', 'Disc. factor', 'Disc. CF', 'Cum. disc.'];

  const rows = results.yearlyBreakdown.map((y) => [
    y.year === 0 ? 'Investering' : `Jaar ${y.year}`,
    fmtEuro(y.grossSavings),
    fmtEuro(y.maintenance),
    fmtEuro(y.subsidy),
    fmtEuro(y.netCashflow),
    y.discountFactor.toFixed(4),
    fmtEuro(y.discountedCashflow),
    fmtEuro(y.cumulativeDiscountedCashflow),
  ]);

  return createElement(Page, { size: 'A4', style: styles.page },
    createHeader('DCF-tabel', pageNum, totalPages),

    createElement(Text, { style: styles.pageTitle }, 'Discounted Cashflow Model'),

    createElement(Text, { style: styles.text },
      `Onderstaande tabel toont het volledige DCF-model over ${data.financials.years} jaar. ` +
      `De discontovoet (WACC) is ${fmtPct(data.financials.discountRate)}.`
    ),

    createTable(headers, rows),

    createElement(View, { style: styles.disclaimer },
      createElement(Text, null,
        'Bruto besparingen zijn gecorrigeerd voor degradatie en energieprijsstijging. ' +
        'De netto contante waarde (NPV) is de cumulatieve verdisconteerde cashflow in het laatste jaar.'
      ),
    ),

    createFooter(reportDate),
  );
}
