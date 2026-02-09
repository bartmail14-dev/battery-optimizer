import type { Worksheet } from 'exceljs';
import type { CalculationResult, SensitivityDataPoint } from '../../../types';
import {
  headerFill, headerFont, titleFont, subtitleFont, bodyFont,
  cellBorders, euroFormat, greenFill, redFill,
} from '../styles';

interface SensitivitySheetData {
  results: CalculationResult;
  sensitivity: SensitivityDataPoint[];
}

export function createSensitivitySheet(ws: Worksheet, data: SensitivitySheetData) {
  ws.columns = [
    { width: 25 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
    { width: 12 },
  ];

  let row = 1;

  // Title
  ws.getCell(row, 1).value = 'Gevoeligheidsanalyse';
  ws.getCell(row, 1).font = titleFont;
  ws.mergeCells(row, 1, row, 5);
  row += 2;

  // Sensitivity matrix
  ws.getCell(row, 1).value = 'Sensitivity Matrix (NPV)';
  ws.getCell(row, 1).font = subtitleFont;
  row++;

  const headers = ['Variabele', 'Laag', 'Basis', 'Hoog', 'Eenheid'];
  headers.forEach((h, i) => {
    const cell = ws.getCell(row, i + 1);
    cell.value = h;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = cellBorders;
  });
  row++;

  data.sensitivity.forEach((s) => {
    ws.getCell(row, 1).value = s.label;
    ws.getCell(row, 1).font = bodyFont;
    ws.getCell(row, 1).border = cellBorders;

    [s.lowNpv, s.baseNpv, s.highNpv].forEach((val, i) => {
      const cell = ws.getCell(row, i + 2);
      cell.value = val;
      cell.numFmt = euroFormat;
      cell.font = bodyFont;
      cell.border = cellBorders;
      cell.fill = val < 0 ? redFill : greenFill;
    });

    ws.getCell(row, 5).value = s.unit;
    ws.getCell(row, 5).font = bodyFont;
    ws.getCell(row, 5).border = cellBorders;
    row++;
  });

  row += 2;

  // Scenario table
  ws.getCell(row, 1).value = 'Scenariovergelijking';
  ws.getCell(row, 1).font = subtitleFont;
  row++;

  const scenHeaders = ['Scenario', 'NPV', 'IRR', 'Terugverdientijd', 'LCOS'];
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
    ws.getCell(row, 3).numFmt = '0,0%';
    ws.getCell(row, 3).font = bodyFont;
    ws.getCell(row, 3).border = cellBorders;

    ws.getCell(row, 4).value = isFinite(s.simplePayback) ? s.simplePayback : null;
    ws.getCell(row, 4).numFmt = '0,0';
    ws.getCell(row, 4).font = bodyFont;
    ws.getCell(row, 4).border = cellBorders;

    ws.getCell(row, 5).value = s.lcos;
    ws.getCell(row, 5).numFmt = '#.##0,00 "\u20AC/kWh"';
    ws.getCell(row, 5).font = bodyFont;
    ws.getCell(row, 5).border = cellBorders;
    row++;
  });
}
