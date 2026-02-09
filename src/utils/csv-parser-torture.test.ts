import { describe, it, expect } from 'vitest';
import { parseKwartierData } from './csv-parser';

/** Generate N lines of simple numeric CSV */
function generateLines(n: number, delimiter = ';', value = 10): string {
  const lines: string[] = [];
  for (let i = 0; i < n; i++) {
    lines.push(`2024-01-01 00:00${delimiter}${value}`);
  }
  return lines.join('\n');
}

function generateDutchLines(n: number, value = '10,50'): string {
  const lines: string[] = [];
  for (let i = 0; i < n; i++) {
    lines.push(`2024-01-01 00:00;${value}`);
  }
  return lines.join('\n');
}

describe('CSV parser torture tests', () => {
  // ── ENCODING ─────────────────────────────────────────────────

  it('handles UTF-8 BOM prefix', () => {
    const csv = '\uFEFF' + generateLines(100, ';', 10);
    const result = parseKwartierData(csv);
    // BOM may cause first line to fail parsing — document behavior
    expect(result.success).toBe(true);
    expect(result.hourlyConsumptionKwh.length).toBe(8760);
  });

  it('handles UTF-8 BOM with Dutch decimals', () => {
    const csv = '\uFEFF' + generateDutchLines(100, '12,50');
    const result = parseKwartierData(csv);
    expect(result.success).toBe(true);
    // If BOM is handled correctly, values should be 12.5
    const nonZero = result.hourlyConsumptionKwh.filter(v => v > 0);
    expect(nonZero.length).toBeGreaterThan(0);
  });

  // ── DELIMITERS ───────────────────────────────────────────────

  it('handles tab-delimited data', () => {
    const csv = generateLines(100, '\t', 15);
    const result = parseKwartierData(csv);
    expect(result.success).toBe(true);
  });

  it('handles single-column data (no delimiter)', () => {
    const lines = Array.from({ length: 100 }, () => '25.5').join('\n');
    const result = parseKwartierData(lines);
    expect(result.success).toBe(true);
    // Should extract 25.5 from each line
    const nonZero = result.hourlyConsumptionKwh.filter(v => v > 0);
    expect(nonZero.length).toBeGreaterThan(0);
  });

  // ── NUMBER FORMATS ───────────────────────────────────────────

  it('documents Dutch "1.234" without comma ambiguity and warns', () => {
    // "1.234" — is this 1234 (Dutch thousands) or 1.234 (English decimal)?
    // Current parser: no comma present → parseFloat("1.234") = 1.234 (English interpretation)
    const csv = Array.from({ length: 100 }, () => '2024-01-01;1.234').join('\n');
    const result = parseKwartierData(csv);
    expect(result.success).toBe(true);
    // Documenting: parser treats "1.234" as English decimal 1.234 (NOT Dutch thousands 1234).
    // 100 rows are detected as quarter-hourly → aggregated to ~25 hourly values (1.234×4 ≈ 4.936)
    // → padded to 8760 → annual ≈ 4.936 × 8760 ≈ 43,239 kWh
    // If parser treated "1.234" as Dutch 1234, annual would be ~43,000,000 kWh
    expect(result.annualConsumptionKwh).toBeLessThan(100_000);   // Clearly not 43M (Dutch)
    expect(result.annualConsumptionKwh).toBeGreaterThan(10_000);  // Clearly not zero
    // Warning about potential Dutch thousands separator
    expect(result.warnings.some(w => w.includes('duizendscheidingstekens'))).toBe(true);
  });

  it('does NOT warn about Dutch thousands when commas are present', () => {
    // "1.234,0" has both dot and comma → parsed correctly as Dutch → 1234.0
    const csv = Array.from({ length: 100 }, () => '2024-01-01;1.234,0').join('\n');
    const result = parseKwartierData(csv);
    expect(result.success).toBe(true);
    expect(result.warnings.some(w => w.includes('duizendscheidingstekens'))).toBe(false);
  });

  it('handles Dutch "1.234,56" (thousands + decimal)', () => {
    const csv = Array.from({ length: 100 }, () => '2024-01-01;1.234,56').join('\n');
    const result = parseKwartierData(csv);
    expect(result.success).toBe(true);
    // Should parse as 1234.56
    const nonZero = result.hourlyConsumptionKwh.filter(v => v > 1000);
    expect(nonZero.length).toBeGreaterThan(0);
  });

  it('handles scientific notation', () => {
    const csv = Array.from({ length: 100 }, () => '2024-01-01;1.5e2').join('\n');
    const result = parseKwartierData(csv);
    expect(result.success).toBe(true);
    const nonZero = result.hourlyConsumptionKwh.filter(v => v >= 150);
    expect(nonZero.length).toBeGreaterThan(0);
  });

  // ── STRUCTURAL ───────────────────────────────────────────────

  it('handles multiple header rows (only first skipped)', () => {
    const header1 = 'Site: Ziekenhuis XYZ;Export 2024';
    const header2 = 'Datum;Verbruik (kWh)';
    const data = Array.from({ length: 100 }, () => '2024-01-01;25,0').join('\n');
    const csv = `${header1}\n${header2}\n${data}`;
    const result = parseKwartierData(csv);
    expect(result.success).toBe(true);
    // header1 is skipped (non-numeric last field)
    // header2 is skipped too (non-numeric "kWh")
    // Row "Verbruik (kWh)" → last field is "(kWh)" → NaN → counted as gap if not header
    expect(result.gaps).toBeGreaterThanOrEqual(0);
  });

  it('handles trailing empty lines', () => {
    const data = generateLines(100, ';', 10);
    const csv = data + '\n'.repeat(200);
    const result = parseKwartierData(csv);
    expect(result.success).toBe(true);
    // Empty lines should be filtered out
    expect(result.rowsParsed).toBeLessThanOrEqual(110);
  });

  it('handles whitespace-only lines interspersed', () => {
    const lines: string[] = [];
    for (let i = 0; i < 100; i++) {
      lines.push(`2024-01-01;${i + 1}`);
      if (i % 5 === 0) lines.push('   '); // whitespace line
    }
    const result = parseKwartierData(lines.join('\n'));
    expect(result.success).toBe(true);
  });

  it('handles extremely long lines (extra columns)', () => {
    const lines = Array.from({ length: 100 }, (_, i) =>
      `SITE-001;2024-01-01;00:00;Zone-A;Meter-${i};Active;${'x'.repeat(500)};${25 + i % 10}`
    ).join('\n');
    const result = parseKwartierData(lines);
    expect(result.success).toBe(true);
    // Should extract last numeric field
    const nonZero = result.hourlyConsumptionKwh.filter(v => v > 20);
    expect(nonZero.length).toBeGreaterThan(0);
  });

  // ── DATA SIZE BOUNDARIES ─────────────────────────────────────

  it('accepts exactly 24 rows (minimum)', () => {
    const csv = generateLines(24, ';', 100);
    const result = parseKwartierData(csv);
    expect(result.success).toBe(true);
    expect(result.hourlyConsumptionKwh.length).toBe(8760);
    // Should be padded
    expect(result.warnings.some(w => w.includes('Aangevuld'))).toBe(true);
  });

  it('rejects 23 rows (below minimum)', () => {
    const csv = generateLines(23, ';', 100);
    const result = parseKwartierData(csv);
    expect(result.success).toBe(false);
  });

  it('handles 96 quarter-hourly rows (1 day)', () => {
    // 96 rows >= 96 threshold → treated as partial quarter-hour data
    const csv = generateLines(96, ';', 5);
    const result = parseKwartierData(csv);
    expect(result.success).toBe(true);
    expect(result.hourlyConsumptionKwh.length).toBe(8760);
  });

  it('handles 4380 hourly rows (6 months)', () => {
    const csv = generateLines(4380, ';', 20);
    const result = parseKwartierData(csv);
    expect(result.success).toBe(true);
    expect(result.hourlyConsumptionKwh.length).toBe(8760);
    // Should be padded cyclically
    expect(result.warnings.some(w => w.includes('Aangevuld') || w.includes('herhalen'))).toBe(true);
  });

  it('trims 8761 rows (1 too many) with warning', () => {
    const csv = generateLines(8761, ';', 20);
    const result = parseKwartierData(csv);
    expect(result.success).toBe(true);
    expect(result.hourlyConsumptionKwh.length).toBe(8760);
    expect(result.warnings.some(w => w.includes('getrimd'))).toBe(true);
  });

  it('handles full quarter-hourly data (35040 rows)', () => {
    const csv = generateLines(35040, ';', 5);
    const result = parseKwartierData(csv);
    expect(result.success).toBe(true);
    expect(result.hourlyConsumptionKwh.length).toBe(8760);
    expect(result.warnings.some(w => w.includes('kwartierwaarden'))).toBe(true);
  });

  it('handles 4 years of quarter-hourly data (140160 rows)', () => {
    // Generate only — verify it doesn't crash and produces 8760 hours
    const csv = generateLines(140160, ';', 3);
    const result = parseKwartierData(csv);
    expect(result.success).toBe(true);
    expect(result.hourlyConsumptionKwh.length).toBe(8760);
  });

  // ── NEGATIVE VALUES ──────────────────────────────────────────

  it('clamps all negative values to 0', () => {
    const csv = Array.from({ length: 100 }, () => '2024-01-01;-50').join('\n');
    const result = parseKwartierData(csv);
    expect(result.success).toBe(true);
    expect(result.hourlyConsumptionKwh.every(v => v >= 0)).toBe(true);
    expect(result.annualConsumptionKwh).toBe(0);
  });

  it('preserves positive values adjacent to negative values', () => {
    const lines: string[] = [];
    for (let i = 0; i < 100; i++) {
      lines.push(`2024-01-01;${i % 2 === 0 ? 50 : -30}`);
    }
    const result = parseKwartierData(lines.join('\n'));
    expect(result.success).toBe(true);
    // Half should be 50, half should be 0 (clamped)
    expect(result.annualConsumptionKwh).toBeGreaterThan(0);
    expect(result.hourlyConsumptionKwh.every(v => v >= 0)).toBe(true);
  });

  it('clamps large negative values (-10000) without overflow', () => {
    const csv = Array.from({ length: 100 }, () => '2024-01-01;-10000').join('\n');
    const result = parseKwartierData(csv);
    expect(result.success).toBe(true);
    expect(result.hourlyConsumptionKwh.every(v => v >= 0)).toBe(true);
    expect(result.peakDemandKw).toBe(0);
  });

  // ── PERFORMANCE ──────────────────────────────────────────────

  it('parses 35040 rows in under 500ms', () => {
    const csv = generateLines(35040, ';', 5);
    const start = performance.now();
    const result = parseKwartierData(csv);
    const elapsed = performance.now() - start;
    expect(result.success).toBe(true);
    expect(elapsed).toBeLessThan(500);
  });
});
