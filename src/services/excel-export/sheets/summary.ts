import type { Worksheet } from 'exceljs';
import type { CalculationResult, BatteryConfig, EnergyProfile, FinancialParams } from '../../../types';
import {
  headerFill, headerFont, titleFont, subtitleFont, bodyFont,
  lightFill, greenFill, redFill, cellBorders,
  euroFormat, pctFormat, num1Format,
} from '../styles';

interface SummarySheetData {
  clientName: string;
  projectRef: string;
  results: CalculationResult;
  battery: BatteryConfig;
  profile: EnergyProfile;
  financials: FinancialParams;
}

export function createSummarySheet(ws: Worksheet, data: SummarySheetData) {
  ws.columns = [
    { width: 30 },
    { width: 20 },
    { width: 20 },
    { width: 20 },
  ];

  let row = 1;

  // Title
  const titleCell = ws.getCell(row, 1);
  titleCell.value = 'COMCAM Battery Optimizer \u2014 Samenvatting';
  titleCell.font = titleFont;
  ws.mergeCells(row, 1, row, 4);
  row += 2;

  // Project info
  ws.getCell(row, 1).value = 'Klant';
  ws.getCell(row, 1).font = bodyFont;
  ws.getCell(row, 2).value = data.clientName;
  ws.getCell(row, 2).font = { ...bodyFont, bold: true };
  row++;
  ws.getCell(row, 1).value = 'Referentie';
  ws.getCell(row, 1).font = bodyFont;
  ws.getCell(row, 2).value = data.projectRef || '-';
  ws.getCell(row, 2).font = bodyFont;
  row++;
  ws.getCell(row, 1).value = 'Datum';
  ws.getCell(row, 1).font = bodyFont;
  ws.getCell(row, 2).value = new Date().toLocaleDateString('nl-NL');
  ws.getCell(row, 2).font = bodyFont;
  row += 2;

  // Go/No-Go
  const verdict = data.results.npv > 0 ? 'GO' : 'NO-GO';
  const verdictCell = ws.getCell(row, 1);
  verdictCell.value = `Advies: ${verdict}`;
  verdictCell.font = { bold: true, size: 14, color: { argb: data.results.npv > 0 ? '16A34A' : 'DC2626' } };
  verdictCell.fill = data.results.npv > 0 ? greenFill : redFill;
  ws.mergeCells(row, 1, row, 4);
  row += 2;

  // Key metrics
  const metricsTitle = ws.getCell(row, 1);
  metricsTitle.value = 'Kernmetrieken';
  metricsTitle.font = subtitleFont;
  row++;

  const metrics: Array<[string, number, string]> = [
    ['Netto Contante Waarde (NPV)', data.results.npv, euroFormat],
    ['Internal Rate of Return (IRR)', data.results.irr, pctFormat],
    ['Terugverdientijd (simpel)', data.results.simplePayback, num1Format],
    ['Terugverdientijd (verdisconteerd)', data.results.discountedPayback, num1Format],
    ['Jaarlijkse besparing', data.results.annualSavings, euroFormat],
    ['Totale besparing', data.results.totalSavings, euroFormat],
    ['LCOS', data.results.lcos, '#.##0,00 "\u20AC/kWh"'],
    ['Bruto investering', data.results.grossInvestment, euroFormat],
    ['Netto investering', data.results.netInvestment, euroFormat],
  ];

  metrics.forEach(([label, value, fmt]) => {
    const labelCell = ws.getCell(row, 1);
    labelCell.value = label;
    labelCell.font = bodyFont;
    labelCell.border = cellBorders;

    const valueCell = ws.getCell(row, 2);
    valueCell.value = isFinite(value) ? value : null;
    valueCell.numFmt = fmt;
    valueCell.font = { ...bodyFont, bold: true };
    valueCell.border = cellBorders;
    row++;
  });

  row += 2;

  // Scenario table
  const scenTitle = ws.getCell(row, 1);
  scenTitle.value = 'Scenariovergelijking';
  scenTitle.font = subtitleFont;
  row++;

  const scenHeaders = ['Scenario', 'NPV', 'IRR', 'Terugverdientijd'];
  scenHeaders.forEach((h, i) => {
    const cell = ws.getCell(row, i + 1);
    cell.value = h;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = cellBorders;
  });
  row++;

  const scenLabels: Record<string, string> = { optimistic: 'Optimistisch', base: 'Basis', pessimistic: 'Pessimistisch' };
  data.results.scenarioResults.forEach((s) => {
    ws.getCell(row, 1).value = scenLabels[s.scenario] ?? s.scenario;
    ws.getCell(row, 1).font = bodyFont;
    ws.getCell(row, 1).border = cellBorders;

    ws.getCell(row, 2).value = s.npv;
    ws.getCell(row, 2).numFmt = euroFormat;
    ws.getCell(row, 2).font = bodyFont;
    ws.getCell(row, 2).border = cellBorders;

    ws.getCell(row, 3).value = isFinite(s.irr) ? s.irr : null;
    ws.getCell(row, 3).numFmt = pctFormat;
    ws.getCell(row, 3).font = bodyFont;
    ws.getCell(row, 3).border = cellBorders;

    ws.getCell(row, 4).value = isFinite(s.simplePayback) ? s.simplePayback : null;
    ws.getCell(row, 4).numFmt = num1Format;
    ws.getCell(row, 4).font = bodyFont;
    ws.getCell(row, 4).border = cellBorders;
    row++;
  });

  // Highlight row for metrics
  for (let r = 1; r <= row; r++) {
    const cell = ws.getCell(r, 1);
    if (!cell.fill || (cell.fill as { pattern?: string }).pattern !== 'solid') {
      ws.getCell(r, 1).fill = r % 2 === 0 ? lightFill : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF' } };
    }
  }
}
