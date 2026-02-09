import type { Worksheet } from 'exceljs';
import type { MonthlyBreakdown } from '../../../types';
import { headerFill, headerFont, titleFont, bodyFont, cellBorders, euroFormat, numFormat } from '../styles';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
  'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December',
];

export function createMonthlySheet(ws: Worksheet, monthlyBreakdown: MonthlyBreakdown[]) {
  ws.columns = [
    { width: 14 },  // Maand
    { width: 18 },  // Zonder batterij
    { width: 18 },  // Met batterij
    { width: 16 },  // Besparing
    { width: 14 },  // Geladen kWh
    { width: 14 },  // Ontladen kWh
    { width: 10 },  // Cycli
  ];

  let row = 1;

  ws.getCell(row, 1).value = 'Maandoverzicht';
  ws.getCell(row, 1).font = titleFont;
  ws.mergeCells(row, 1, row, 7);
  row += 2;

  const headers = ['Maand', 'Zonder batterij', 'Met batterij', 'Besparing', 'Geladen (kWh)', 'Ontladen (kWh)', 'Cycli'];
  headers.forEach((h, i) => {
    const cell = ws.getCell(row, i + 1);
    cell.value = h;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = cellBorders;
  });
  row++;

  const dataStart = row;

  monthlyBreakdown.forEach((m, i) => {
    ws.getCell(row, 1).value = MONTH_NAMES[i] ?? m.label;
    ws.getCell(row, 1).font = bodyFont;
    ws.getCell(row, 1).border = cellBorders;

    ws.getCell(row, 2).value = m.costWithout;
    ws.getCell(row, 2).numFmt = euroFormat;
    ws.getCell(row, 2).font = bodyFont;
    ws.getCell(row, 2).border = cellBorders;

    ws.getCell(row, 3).value = m.costWith;
    ws.getCell(row, 3).numFmt = euroFormat;
    ws.getCell(row, 3).font = bodyFont;
    ws.getCell(row, 3).border = cellBorders;

    // Besparing formula
    ws.getCell(row, 4).value = { formula: `B${row}-C${row}` };
    ws.getCell(row, 4).numFmt = euroFormat;
    ws.getCell(row, 4).font = { ...bodyFont, bold: true };
    ws.getCell(row, 4).border = cellBorders;

    ws.getCell(row, 5).value = m.energyCharged;
    ws.getCell(row, 5).numFmt = numFormat;
    ws.getCell(row, 5).font = bodyFont;
    ws.getCell(row, 5).border = cellBorders;

    ws.getCell(row, 6).value = m.energyDischarged;
    ws.getCell(row, 6).numFmt = numFormat;
    ws.getCell(row, 6).font = bodyFont;
    ws.getCell(row, 6).border = cellBorders;

    ws.getCell(row, 7).value = m.cycles;
    ws.getCell(row, 7).numFmt = numFormat;
    ws.getCell(row, 7).font = bodyFont;
    ws.getCell(row, 7).border = cellBorders;

    row++;
  });

  // Totals row
  row++;
  ws.getCell(row, 1).value = 'Totaal';
  ws.getCell(row, 1).font = { ...bodyFont, bold: true };
  ws.getCell(row, 1).border = cellBorders;

  [2, 3, 4, 5, 6, 7].forEach((col) => {
    ws.getCell(row, col).value = { formula: `SUM(${String.fromCharCode(64 + col)}${dataStart}:${String.fromCharCode(64 + col)}${dataStart + 11})` };
    ws.getCell(row, col).numFmt = col <= 4 ? euroFormat : numFormat;
    ws.getCell(row, col).font = { ...bodyFont, bold: true };
    ws.getCell(row, col).border = cellBorders;
  });
}
