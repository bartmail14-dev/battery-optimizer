import type { Worksheet } from 'exceljs';
import type { CalculationResult, FinancialParams } from '../../../types';
import {
  headerFill, headerFont, titleFont, subtitleFont, bodyFont,
  cellBorders, euroFormat, pctFormat,
} from '../styles';

interface DcfSheetData {
  results: CalculationResult;
  financials: FinancialParams;
}

export function createDcfSheet(ws: Worksheet, data: DcfSheetData) {
  const { results, financials } = data;

  ws.columns = [
    { width: 12 },  // A: Jaar
    { width: 16 },  // B: Bruto besparing
    { width: 14 },  // C: Onderhoud
    { width: 14 },  // D: Subsidie
    { width: 16 },  // E: Netto CF
    { width: 14 },  // F: Disc. factor
    { width: 16 },  // G: Disc. CF
    { width: 18 },  // H: Cum. disc. CF
  ];

  let row = 1;

  // Title
  const titleCell = ws.getCell(row, 1);
  titleCell.value = 'DCF Model';
  titleCell.font = titleFont;
  ws.mergeCells(row, 1, row, 8);
  row += 2;

  // WACC parameter cell (named)
  ws.getCell(row, 1).value = 'WACC';
  ws.getCell(row, 1).font = subtitleFont;
  const waccCell = ws.getCell(row, 2);
  waccCell.value = financials.discountRate;
  waccCell.numFmt = pctFormat;
  waccCell.font = { ...bodyFont, bold: true };
  // Name this cell so formulas can reference it
  ws.workbook.definedNames.add('WACC', `'DCF Model'!$B$${row}`);
  row += 2;

  // Headers
  const headers = ['Jaar', 'Bruto besp.', 'Onderhoud', 'Subsidie', 'Netto CF', 'Disc. factor', 'Disc. CF', 'Cum. disc. CF'];
  headers.forEach((h, i) => {
    const cell = ws.getCell(row, i + 1);
    cell.value = h;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = cellBorders;
  });
  row++;

  const dataStartRow = row;

  // Data rows with formulas
  results.yearlyBreakdown.forEach((y, idx) => {
    const r = dataStartRow + idx;

    // A: Year
    ws.getCell(r, 1).value = y.year === 0 ? 'Investering' : `Jaar ${y.year}`;
    ws.getCell(r, 1).font = bodyFont;
    ws.getCell(r, 1).border = cellBorders;

    // B: Gross savings (data value)
    ws.getCell(r, 2).value = y.grossSavings;
    ws.getCell(r, 2).numFmt = euroFormat;
    ws.getCell(r, 2).font = bodyFont;
    ws.getCell(r, 2).border = cellBorders;

    // C: Maintenance (data value)
    ws.getCell(r, 3).value = y.maintenance;
    ws.getCell(r, 3).numFmt = euroFormat;
    ws.getCell(r, 3).font = bodyFont;
    ws.getCell(r, 3).border = cellBorders;

    // D: Subsidy (data value)
    ws.getCell(r, 4).value = y.subsidy;
    ws.getCell(r, 4).numFmt = euroFormat;
    ws.getCell(r, 4).font = bodyFont;
    ws.getCell(r, 4).border = cellBorders;

    // E: Net CF = B - C + D (formula)
    ws.getCell(r, 5).value = { formula: `B${r}-C${r}+D${r}` };
    ws.getCell(r, 5).numFmt = euroFormat;
    ws.getCell(r, 5).font = { ...bodyFont, bold: true };
    ws.getCell(r, 5).border = cellBorders;

    // F: Discount factor = 1/(1+WACC)^year (formula)
    ws.getCell(r, 6).value = { formula: `1/(1+WACC)^${y.year}` };
    ws.getCell(r, 6).numFmt = '0,0000';
    ws.getCell(r, 6).font = bodyFont;
    ws.getCell(r, 6).border = cellBorders;

    // G: Discounted CF = E * F (formula)
    ws.getCell(r, 7).value = { formula: `E${r}*F${r}` };
    ws.getCell(r, 7).numFmt = euroFormat;
    ws.getCell(r, 7).font = bodyFont;
    ws.getCell(r, 7).border = cellBorders;

    // H: Cumulative discounted CF (formula)
    if (idx === 0) {
      ws.getCell(r, 8).value = { formula: `G${r}` };
    } else {
      ws.getCell(r, 8).value = { formula: `H${r - 1}+G${r}` };
    }
    ws.getCell(r, 8).numFmt = euroFormat;
    ws.getCell(r, 8).font = { ...bodyFont, bold: true };
    ws.getCell(r, 8).border = cellBorders;
  });

  const lastDataRow = dataStartRow + results.yearlyBreakdown.length - 1;

  // NPV summary row
  const npvRow = lastDataRow + 2;
  ws.getCell(npvRow, 1).value = 'NPV';
  ws.getCell(npvRow, 1).font = { ...subtitleFont, size: 12 };
  ws.getCell(npvRow, 2).value = { formula: `H${lastDataRow}` };
  ws.getCell(npvRow, 2).numFmt = euroFormat;
  ws.getCell(npvRow, 2).font = { bold: true, size: 12, color: { argb: '2563EB' } };
}
