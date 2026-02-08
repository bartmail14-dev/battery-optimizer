import { describe, it, expect } from 'vitest';
import { parseKwartierData } from './csv-parser';

function generateCsvRows(count: number, delimiter = ';', value = 5): string {
  const rows: string[] = [];
  rows.push(`timestamp${delimiter}kWh`); // header
  for (let i = 0; i < count; i++) {
    const h = Math.floor(i / 4);
    const q = (i % 4) * 15;
    rows.push(`2024-01-01 ${String(h % 24).padStart(2, '0')}:${String(q).padStart(2, '0')}${delimiter}${value}`);
  }
  return rows.join('\n');
}

describe('parseKwartierData', () => {
  // --- Basic parsing ---

  it('parses a full year of quarter-hour data (35040 rows)', () => {
    const csv = generateCsvRows(35040);
    const result = parseKwartierData(csv);
    expect(result.success).toBe(true);
    expect(result.hourlyConsumptionKwh).toHaveLength(8760);
  });

  it('correctly aggregates 4 quarter-hour values to hourly', () => {
    // 4 values of 5 kWh each → 20 kWh per hour
    const csv = generateCsvRows(35040, ';', 5);
    const result = parseKwartierData(csv);
    expect(result.success).toBe(true);
    // Each hour should be 4 * 5 = 20
    expect(result.hourlyConsumptionKwh[0]).toBeCloseTo(20, 1);
  });

  it('derives annual consumption from sum', () => {
    const csv = generateCsvRows(35040, ';', 5);
    const result = parseKwartierData(csv);
    expect(result.success).toBe(true);
    // 35040 * 5 = 175200 kWh total
    expect(result.annualConsumptionKwh).toBeCloseTo(175200, 0);
  });

  it('derives peak demand from max hourly value', () => {
    const csv = generateCsvRows(35040, ';', 5);
    const result = parseKwartierData(csv);
    expect(result.success).toBe(true);
    expect(result.peakDemandKw).toBeCloseTo(20, 1);
  });

  // --- Delimiter detection ---

  it('handles semicolon delimiter', () => {
    const csv = generateCsvRows(960, ';', 10);
    const result = parseKwartierData(csv);
    expect(result.success).toBe(true);
    expect(result.rowsParsed).toBe(960);
  });

  it('handles comma delimiter', () => {
    const rows = ['timestamp,kWh'];
    for (let i = 0; i < 960; i++) {
      rows.push(`2024-01-01 00:00,10`);
    }
    const result = parseKwartierData(rows.join('\n'));
    expect(result.success).toBe(true);
    expect(result.rowsParsed).toBe(960);
  });

  it('handles tab delimiter', () => {
    const rows = ['timestamp\tkWh'];
    for (let i = 0; i < 960; i++) {
      rows.push(`2024-01-01 00:00\t10`);
    }
    const result = parseKwartierData(rows.join('\n'));
    expect(result.success).toBe(true);
  });

  // --- Dutch number format ---

  it('parses Dutch comma-decimal numbers (12,5)', () => {
    const rows = ['tijd;verbruik'];
    for (let i = 0; i < 96; i++) {
      rows.push(`2024-01-01 00:00;12,5`);
    }
    const result = parseKwartierData(rows.join('\n'));
    expect(result.success).toBe(true);
    // Each quarter = 12.5, so each hour = 50
    expect(result.hourlyConsumptionKwh[0]).toBeCloseTo(50, 1);
  });

  it('parses Dutch thousands+decimal (1.234,56)', () => {
    const rows = ['tijd;verbruik'];
    for (let i = 0; i < 96; i++) {
      rows.push(`2024-01-01 00:00;1.234,56`);
    }
    const result = parseKwartierData(rows.join('\n'));
    expect(result.success).toBe(true);
    expect(result.hourlyConsumptionKwh[0]).toBeCloseTo(4938.24, 0);
  });

  // --- Header detection ---

  it('skips header rows automatically', () => {
    const csv = generateCsvRows(960);
    const result = parseKwartierData(csv);
    expect(result.success).toBe(true);
    expect(result.warnings.some(w => w.includes('koprij'))).toBe(true);
  });

  it('handles files without headers', () => {
    const rows: string[] = [];
    for (let i = 0; i < 960; i++) {
      rows.push(`2024-01-01 00:00;10`);
    }
    const result = parseKwartierData(rows.join('\n'));
    expect(result.success).toBe(true);
    expect(result.rowsParsed).toBe(960);
  });

  // --- Partial data ---

  it('handles partial year data with padding', () => {
    const csv = generateCsvRows(672, ';', 10); // 1 week
    const result = parseKwartierData(csv);
    expect(result.success).toBe(true);
    expect(result.hourlyConsumptionKwh).toHaveLength(8760);
    expect(result.warnings.some(w => w.includes('Aangevuld') || w.includes('Partiële'))).toBe(true);
  });

  it('handles hourly data (8760 rows)', () => {
    const rows = ['uur;kWh'];
    for (let i = 0; i < 8760; i++) {
      rows.push(`${i};25`);
    }
    const result = parseKwartierData(rows.join('\n'));
    expect(result.success).toBe(true);
    expect(result.hourlyConsumptionKwh).toHaveLength(8760);
    expect(result.hourlyConsumptionKwh[0]).toBeCloseTo(25, 1);
  });

  // --- Edge cases ---

  it('returns error for too few rows', () => {
    const result = parseKwartierData('header;value\n1;5');
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('returns error for empty input', () => {
    const result = parseKwartierData('');
    expect(result.success).toBe(false);
  });

  it('clamps negative values to 0', () => {
    const rows = ['tijd;kWh'];
    for (let i = 0; i < 96; i++) {
      rows.push(`2024-01-01 00:00;-5`);
    }
    const result = parseKwartierData(rows.join('\n'));
    expect(result.success).toBe(true);
    expect(result.hourlyConsumptionKwh[0]).toBe(0);
  });

  it('handles rows with invalid values (NaN)', () => {
    const rows = ['tijd;kWh'];
    for (let i = 0; i < 96; i++) {
      rows.push(i % 10 === 0 ? `abc;def` : `2024-01-01;10`);
    }
    const result = parseKwartierData(rows.join('\n'));
    expect(result.success).toBe(true);
    expect(result.gaps).toBeGreaterThan(0);
    expect(result.warnings.some(w => w.includes('ongeldige'))).toBe(true);
  });

  it('handles Windows line endings (\\r\\n)', () => {
    const csv = generateCsvRows(960).replace(/\n/g, '\r\n');
    const result = parseKwartierData(csv);
    expect(result.success).toBe(true);
    expect(result.rowsParsed).toBe(960);
  });

  it('trims data longer than a year', () => {
    const csv = generateCsvRows(40000, ';', 5);
    const result = parseKwartierData(csv);
    expect(result.success).toBe(true);
    expect(result.hourlyConsumptionKwh).toHaveLength(8760);
    expect(result.warnings.some(w => w.includes('getrimd'))).toBe(true);
  });

  it('all hourly values are non-negative', () => {
    const csv = generateCsvRows(35040);
    const result = parseKwartierData(csv);
    expect(result.success).toBe(true);
    for (const v of result.hourlyConsumptionKwh) {
      expect(v).toBeGreaterThanOrEqual(0);
    }
  });

  it('rowsParsed reflects actual data rows (minus header)', () => {
    const csv = generateCsvRows(1000);
    const result = parseKwartierData(csv);
    expect(result.rowsParsed).toBe(1000);
  });
});
