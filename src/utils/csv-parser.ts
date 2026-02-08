import type { KwartierDataParseResult } from '../types';

const HOURS_PER_YEAR = 8760;
const QUARTERS_PER_HOUR = 4;
const QUARTERS_PER_YEAR = HOURS_PER_YEAR * QUARTERS_PER_HOUR; // 35040

/**
 * Parses a Dutch-formatted number string.
 * Dutch convention: "1.234,56" → 1234.56
 * Also handles plain decimals: "12.5" → 12.5
 */
function parseDutchNumber(raw: string): number {
  const s = raw.trim();
  if (s === '') return NaN;

  // If both . and , are present, treat , as decimal separator (Dutch)
  if (s.includes('.') && s.includes(',')) {
    return parseFloat(s.replace(/\./g, '').replace(',', '.'));
  }
  // If only , is present, treat it as decimal separator
  if (s.includes(',') && !s.includes('.')) {
    return parseFloat(s.replace(',', '.'));
  }
  // Otherwise parse as-is (English format or integer)
  return parseFloat(s);
}

/**
 * Detects delimiter by counting occurrences of ; and , in a sample of lines.
 */
function detectDelimiter(lines: string[]): string {
  const sample = lines.slice(0, Math.min(10, lines.length));
  let semicolons = 0;
  let commas = 0;
  let tabs = 0;

  for (const line of sample) {
    semicolons += (line.match(/;/g) || []).length;
    commas += (line.match(/,/g) || []).length;
    tabs += (line.match(/\t/g) || []).length;
  }

  if (tabs >= semicolons && tabs >= commas && tabs > 0) return '\t';
  if (semicolons >= commas) return ';';
  return ',';
}

/**
 * Checks if a string looks like a header (non-numeric content).
 */
function isHeaderRow(fields: string[]): boolean {
  // If the last field (which should be the value) is not a number, it's a header
  const lastField = fields[fields.length - 1]?.trim() || '';
  return isNaN(parseDutchNumber(lastField));
}

/**
 * Extracts the numeric kWh value from a row's fields.
 * Takes the last numeric field (convention: timestamps first, value last).
 */
function extractValue(fields: string[]): number {
  // Try the last field first
  for (let i = fields.length - 1; i >= 0; i--) {
    const val = parseDutchNumber(fields[i]);
    if (!isNaN(val)) return val;
  }
  return NaN;
}

/**
 * Aggregates quarter-hour values to hourly by summing groups of 4.
 */
function aggregateToHourly(quarterHourly: number[]): number[] {
  const hourly: number[] = [];
  for (let i = 0; i < quarterHourly.length; i += QUARTERS_PER_HOUR) {
    const chunk = quarterHourly.slice(i, i + QUARTERS_PER_HOUR);
    hourly.push(chunk.reduce((sum, v) => sum + v, 0));
  }
  return hourly;
}

/**
 * Pads or trims hourly data to exactly 8760 entries.
 */
function normalizeToYear(hourly: number[], warnings: string[]): number[] {
  if (hourly.length === HOURS_PER_YEAR) return hourly;

  if (hourly.length > HOURS_PER_YEAR) {
    warnings.push(`Data bevat ${hourly.length} uurwaarden, getrimd naar ${HOURS_PER_YEAR}.`);
    return hourly.slice(0, HOURS_PER_YEAR);
  }

  // Pad by repeating the pattern
  warnings.push(
    `Data bevat ${hourly.length} uurwaarden (${(hourly.length / 24).toFixed(0)} dagen). ` +
    `Aangevuld tot ${HOURS_PER_YEAR} door het patroon te herhalen.`
  );
  const padded = [...hourly];
  while (padded.length < HOURS_PER_YEAR) {
    padded.push(hourly[padded.length % hourly.length]);
  }
  return padded.slice(0, HOURS_PER_YEAR);
}

/**
 * Parses Dutch kwartierdata CSV and aggregates to hourly consumption.
 *
 * Supports:
 * - Semicolon, comma, or tab delimiters (auto-detected)
 * - Dutch number format (1.234,56)
 * - Automatic header detection and skipping
 * - Quarter-hour (35040 rows) or hourly (8760 rows) data
 * - Partial years (padded by repeating the pattern)
 */
export function parseKwartierData(csvText: string): KwartierDataParseResult {
  const warnings: string[] = [];

  // Split and clean lines
  const lines = csvText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if (lines.length < 24) {
    return {
      success: false,
      hourlyConsumptionKwh: [],
      annualConsumptionKwh: 0,
      peakDemandKw: 0,
      rowsParsed: 0,
      gaps: 0,
      error: 'Bestand bevat te weinig rijen (minimaal 24 nodig).',
      warnings,
    };
  }

  // Detect delimiter
  const delimiter = detectDelimiter(lines);

  // Parse all rows, skip headers
  const values: number[] = [];
  let skippedHeaders = 0;
  let nanCount = 0;

  for (const line of lines) {
    const fields = line.split(delimiter);
    if (values.length === 0 && isHeaderRow(fields)) {
      skippedHeaders++;
      continue;
    }
    const val = extractValue(fields);
    if (isNaN(val)) {
      nanCount++;
      values.push(0); // treat as gap
    } else {
      values.push(Math.max(0, val)); // clamp negatives to 0
    }
  }

  if (values.length < 24) {
    return {
      success: false,
      hourlyConsumptionKwh: [],
      annualConsumptionKwh: 0,
      peakDemandKw: 0,
      rowsParsed: values.length,
      gaps: nanCount,
      error: `Slechts ${values.length} geldige rijen gevonden na parsing.`,
      warnings,
    };
  }

  if (skippedHeaders > 0) {
    warnings.push(`${skippedHeaders} koprij(en) overgeslagen.`);
  }
  if (nanCount > 0) {
    warnings.push(`${nanCount} ongeldige waarden vervangen door 0.`);
  }

  // Determine if data is quarter-hourly or hourly
  let hourly: number[];
  if (values.length >= QUARTERS_PER_YEAR * 0.8) {
    // Looks like quarter-hour data
    hourly = aggregateToHourly(values);
    warnings.push(`${values.length} kwartierwaarden geaggregeerd naar ${hourly.length} uurwaarden.`);
  } else if (values.length >= HOURS_PER_YEAR * 0.8) {
    // Looks like hourly data
    hourly = values;
  } else if (values.length >= 96) {
    // Could be quarter-hour data for partial year
    hourly = aggregateToHourly(values);
    warnings.push(`Partiële dataset: ${values.length} kwartierwaarden → ${hourly.length} uurwaarden.`);
  } else {
    // Short data, assume hourly
    hourly = values;
  }

  // Normalize to exactly 8760
  hourly = normalizeToYear(hourly, warnings);

  const annualConsumptionKwh = hourly.reduce((s, v) => s + v, 0);
  const peakDemandKw = Math.max(...hourly);

  return {
    success: true,
    hourlyConsumptionKwh: hourly,
    annualConsumptionKwh,
    peakDemandKw,
    rowsParsed: values.length,
    gaps: nanCount,
    warnings,
  };
}
