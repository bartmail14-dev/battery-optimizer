/**
 * Test fixture helpers: realistic energy profiles and CSV builders.
 *
 * Profile generators create 8760-hour arrays mimicking real Dutch facility types.
 * CSV builders produce strings with various format combinations for parser torture testing.
 */

import type { BatteryConfig, EnergyProfile, TariffStructure, SubsidyConfig, FinancialParams, Sector } from '../types';
import { EPEX_TYPICAL_PROFILE } from '../constants';

// ─── Shared constants ────────────────────────────────────────────

const HOURS = 8760;

// ─── Profile generators ─────────────────────────────────────────

/** Hospital: 24/7 high base load, morning peak, 75% weekend */
export function generateHospitalProfile(annualKwh = 2_000_000): number[] {
  const hours = new Array(HOURS).fill(0);
  const avgHourly = annualKwh / HOURS;
  const shape = [
    0.60, 0.55, 0.50, 0.50, 0.55, 0.70, 0.90, 1.20, 1.50, 1.40, 1.30, 1.20,
    1.20, 1.30, 1.20, 1.10, 1.00, 0.90, 0.80, 0.75, 0.70, 0.65, 0.60, 0.55,
  ];
  const shapeAvg = shape.reduce((s, v) => s + v, 0) / 24;
  for (let h = 0; h < HOURS; h++) {
    const hod = h % 24;
    const doy = Math.floor(h / 24);
    const isWeekend = (doy % 7) >= 5;
    hours[h] = avgHourly * (shape[hod] / shapeAvg) * (isWeekend ? 0.75 : 1.0);
  }
  const sum = hours.reduce((s, v) => s + v, 0);
  const scale = annualKwh / sum;
  return hours.map(v => v * scale);
}

/** Supermarket: refrigeration base 40%, opening hours peak, weekend slightly higher */
export function generateSupermarketProfile(annualKwh = 500_000): number[] {
  const hours = new Array(HOURS).fill(0);
  const avgHourly = annualKwh / HOURS;
  const shape = [
    0.40, 0.40, 0.40, 0.40, 0.40, 0.50, 0.80, 1.10, 1.40, 1.50, 1.50, 1.40,
    1.30, 1.30, 1.40, 1.50, 1.50, 1.40, 1.20, 0.80, 0.50, 0.40, 0.40, 0.40,
  ];
  const shapeAvg = shape.reduce((s, v) => s + v, 0) / 24;
  for (let h = 0; h < HOURS; h++) {
    const hod = h % 24;
    const doy = Math.floor(h / 24);
    const isWeekend = (doy % 7) >= 5;
    hours[h] = avgHourly * (shape[hod] / shapeAvg) * (isWeekend ? 1.15 : 1.0);
  }
  const sum = hours.reduce((s, v) => s + v, 0);
  const scale = annualKwh / sum;
  return hours.map(v => v * scale);
}

/** Office: near-zero at night/weekends, sharp 8x ramp at 7am, cliff at 18:00 */
export function generateOfficeProfile(annualKwh = 150_000): number[] {
  const hours = new Array(HOURS).fill(0);
  const avgHourly = annualKwh / HOURS;
  const shape = [
    0.15, 0.15, 0.15, 0.15, 0.15, 0.20, 0.50, 1.20, 1.60, 1.70, 1.70, 1.60,
    1.30, 1.50, 1.60, 1.60, 1.50, 1.20, 0.50, 0.20, 0.15, 0.15, 0.15, 0.15,
  ];
  const shapeAvg = shape.reduce((s, v) => s + v, 0) / 24;
  for (let h = 0; h < HOURS; h++) {
    const hod = h % 24;
    const doy = Math.floor(h / 24);
    const isWeekend = (doy % 7) >= 5;
    hours[h] = avgHourly * (shape[hod] / shapeAvg) * (isWeekend ? 0.25 : 1.0);
  }
  const sum = hours.reduce((s, v) => s + v, 0);
  const scale = annualKwh / sum;
  return hours.map(v => v * scale);
}

/** Factory: 3-shift continuous, 70% base, no weekend drop */
export function generateFactoryProfile(annualKwh = 800_000): number[] {
  const hours = new Array(HOURS).fill(0);
  const avgHourly = annualKwh / HOURS;
  const shape = [
    0.70, 0.70, 0.70, 0.70, 0.70, 0.80, 1.00, 1.30, 1.50, 1.50, 1.50, 1.40,
    1.20, 1.40, 1.50, 1.50, 1.30, 1.00, 0.80, 0.70, 0.70, 0.70, 0.70, 0.70,
  ];
  const shapeAvg = shape.reduce((s, v) => s + v, 0) / 24;
  for (let h = 0; h < HOURS; h++) {
    const hod = h % 24;
    hours[h] = avgHourly * (shape[hod] / shapeAvg); // No weekend factor — continuous production
  }
  const sum = hours.reduce((s, v) => s + v, 0);
  const scale = annualKwh / sum;
  return hours.map(v => v * scale);
}

/** School: zero nights/weekends, zero during 6 weeks of holidays */
export function generateSchoolProfile(annualKwh = 120_000): number[] {
  const hours = new Array(HOURS).fill(0);
  const avgHourly = annualKwh / HOURS;
  const shape = [
    0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.2, 0.8, 1.5, 1.8, 1.8, 1.7,
    1.3, 1.5, 1.7, 1.7, 1.5, 0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
  ];
  const shapeAvg = shape.reduce((s, v) => s + v, 0) / 24;
  // Holiday weeks (approximate): weeks 1-2 (kerst), 8-9 (voorjaar), 17 (mei), 29-34 (zomer), 43 (herfst)
  const holidayWeeks = new Set([1, 2, 8, 9, 17, 29, 30, 31, 32, 33, 34, 43]);
  for (let h = 0; h < HOURS; h++) {
    const hod = h % 24;
    const doy = Math.floor(h / 24);
    const week = Math.floor(doy / 7);
    const isWeekend = (doy % 7) >= 5;
    const isHoliday = holidayWeeks.has(week);
    if (isWeekend || isHoliday) {
      hours[h] = 0;
    } else {
      hours[h] = avgHourly * (shape[hod] / (shapeAvg || 1));
    }
  }
  const sum = hours.reduce((s, v) => s + v, 0);
  const scale = sum > 0 ? annualKwh / sum : 0;
  return hours.map(v => v * scale);
}

/** Datacenter: near-constant load 24/7/365 (1% variation) */
export function generateDatacenterProfile(annualKwh = 4_380_000): number[] {
  const avgHourly = annualKwh / HOURS; // 500 kWh/hr
  const hours: number[] = [];
  for (let h = 0; h < HOURS; h++) {
    // Tiny sinusoidal variation: ±1%
    const noise = 1.0 + 0.01 * Math.sin(h * 0.1);
    hours.push(avgHourly * noise);
  }
  const sum = hours.reduce((s, v) => s + v, 0);
  const scale = annualKwh / sum;
  return hours.map(v => v * scale);
}

/** Hotel with rooftop solar: consumption goes NEGATIVE midday in summer (feed-in) */
export function generateHotelWithSolarProfile(annualKwh = 150_000): number[] {
  const hours = new Array(HOURS).fill(0);
  const avgHourly = annualKwh / HOURS;
  const hotelShape = [
    0.4, 0.35, 0.3, 0.3, 0.35, 0.5, 0.8, 1.1, 1.3, 1.2, 1.1, 1.0,
    1.1, 1.0, 0.9, 0.9, 1.0, 1.2, 1.4, 1.3, 1.1, 0.9, 0.7, 0.5,
  ];
  const shapeAvg = hotelShape.reduce((s, v) => s + v, 0) / 24;
  for (let h = 0; h < HOURS; h++) {
    const hod = h % 24;
    const doy = Math.floor(h / 24);
    const month = Math.floor(doy / 30.44);
    // Solar generation peaks in summer (month 4-8), hours 9-16
    const isSummerish = month >= 4 && month <= 8;
    const isSolarHour = hod >= 9 && hod <= 16;
    let consumption = avgHourly * (hotelShape[hod] / shapeAvg);
    if (isSummerish && isSolarHour) {
      // Solar generation exceeds consumption at midday → negative net
      const solarPeak = avgHourly * 2.5; // Strong solar generation
      const solarCurve = Math.sin((hod - 6) * Math.PI / 14); // Bell curve
      consumption -= solarPeak * Math.max(0, solarCurve);
    }
    hours[h] = consumption; // Can be negative!
  }
  return hours; // Intentionally NOT scaled — negative values are the point
}

/** EV charging station: extreme spikes, lots of zeros */
export function generateEVChargingProfile(annualKwh = 200_000): number[] {
  const hours = new Array(HOURS).fill(0);
  const avgHourly = annualKwh / HOURS;
  for (let h = 0; h < HOURS; h++) {
    const hod = h % 24;
    const doy = Math.floor(h / 24);
    const isWeekday = (doy % 7) < 5;
    // Commuter charging: 7-9am and 17-19pm on weekdays
    const isMorningPeak = isWeekday && hod >= 7 && hod <= 9;
    const isEveningPeak = isWeekday && hod >= 17 && hod <= 19;
    if (isMorningPeak || isEveningPeak) {
      hours[h] = avgHourly * 6; // Heavy spikes
    } else if (hod >= 10 && hod <= 16) {
      hours[h] = avgHourly * 1.5; // Moderate daytime
    } else {
      hours[h] = avgHourly * 0.1; // Near-zero overnight
    }
  }
  const sum = hours.reduce((s, v) => s + v, 0);
  const scale = annualKwh / sum;
  return hours.map(v => v * scale);
}

// ─── Standard test configurations ──────────────────────────────

export const baseBattery: BatteryConfig = {
  capacityKwh: 100,
  powerKw: 50,
  roundTripEfficiency: 0.89,
  annualDegradation: 0.025,
  cycleLife: 12000,
  depthOfDischarge: 0.9,
  costPerKwh: 550,
  installationCost: 15_000,
  annualMaintenanceCost: 2_000,
  lifespanYears: 15,
};

export const baseTariffs: TariffStructure = {
  commodityRatePerKwh: 0.12,
  peakRate: 0.22,
  offPeakRate: 0.14,
  networkTariffPerKw: 27.5,
  energyTaxPerKwh: 0.01312,
  odeSurchargePerKwh: 0.00642,
  feedInTariffPerKwh: 0.07,
  pricingMode: 'dynamic',
  hourlyPrices: EPEX_TYPICAL_PROFILE,
};

export const baseSubsidies: SubsidyConfig = {
  sdeEligible: true,
  sdeBaseAmount: 0.068,
  eiaPercentage: 0.455,
  eiaMaxDeduction: 136_000_000,
};

export const noSubsidies: SubsidyConfig = {
  sdeEligible: false,
  sdeBaseAmount: 0.068,
  eiaPercentage: 0,
  eiaMaxDeduction: 136_000_000,
};

export const baseFinancials: FinancialParams = {
  discountRate: 0.06,
  inflationRate: 0.025,
  electricityPriceGrowthRate: 0.03,
  years: 15,
};

export function makeProfile(
  hourly: number[],
  sector: Sector = 'hospitality',
  dataSource: 'csv' | 'synthetic' = 'csv'
): EnergyProfile {
  const annual = hourly.reduce((s, v) => s + v, 0);
  return {
    hourlyConsumptionKwh: hourly,
    peakDemandKw: Math.max(...hourly),
    annualConsumptionKwh: annual,
    connectionCapacityKw: Math.ceil(Math.max(...hourly) * 1.2),
    sector,
    dataSource,
  };
}

// ─── CSV builders ───────────────────────────────────────────────

interface CSVOptions {
  delimiter?: string;
  decimalSeparator?: 'dot' | 'comma';
  header?: string | null;
  bom?: boolean;
  crlf?: boolean;
  extraColumns?: boolean;
}

/** Build a CSV string from an array of numbers with configurable format */
export function buildCSV(values: number[], options: CSVOptions = {}): string {
  const {
    delimiter = ';',
    decimalSeparator = 'comma',
    header = null,
    bom = false,
    crlf = false,
    extraColumns = false,
  } = options;

  const lineEnd = crlf ? '\r\n' : '\n';
  const lines: string[] = [];

  if (bom) {
    // BOM prefix will be prepended to the first line
  }

  if (header) {
    lines.push(header);
  }

  for (let i = 0; i < values.length; i++) {
    let numStr: string;
    if (decimalSeparator === 'comma') {
      // Dutch format: "123,45"
      numStr = values[i].toFixed(2).replace('.', ',');
    } else {
      numStr = values[i].toFixed(2);
    }

    const timestamp = `2024-01-01 ${String(Math.floor((i % 96) / 4)).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}`;
    let line = `${timestamp}${delimiter}${numStr}`;

    if (extraColumns) {
      line = `METER-001${delimiter}${timestamp}${delimiter}${numStr}${delimiter}kWh`;
    }

    lines.push(line);
  }

  const content = lines.join(lineEnd);
  return bom ? '\uFEFF' + content : content;
}

/** Shortcut: Dutch semicolon-separated CSV */
export function dutchSemicolonCSV(values: number[], header?: string): string {
  return buildCSV(values, { delimiter: ';', decimalSeparator: 'comma', header });
}

/** Shortcut: English comma-separated CSV */
export function englishCommaCSV(values: number[], header?: string): string {
  return buildCSV(values, { delimiter: ',', decimalSeparator: 'dot', header });
}

/** Shortcut: Tab-separated, no header */
export function tabNoHeaderCSV(values: number[]): string {
  return buildCSV(values, { delimiter: '\t', decimalSeparator: 'dot', header: null });
}

/** Shortcut: BOM + Windows CRLF + Dutch format */
export function bomWindowsCRLF(values: number[], header?: string): string {
  return buildCSV(values, {
    delimiter: ';',
    decimalSeparator: 'comma',
    header,
    bom: true,
    crlf: true,
  });
}
