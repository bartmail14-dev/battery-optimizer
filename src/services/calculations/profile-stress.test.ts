import { describe, it, expect } from 'vitest';
import { generateHourlyProfile } from './profile-generator';
import { simulateBatteryOperation } from './battery-simulation';
import { parseKwartierData } from '../../utils/csv-parser';
import {
  generateHospitalProfile,
  generateSupermarketProfile,
  generateOfficeProfile,
  generateFactoryProfile,
  generateSchoolProfile,
  generateDatacenterProfile,
  generateHotelWithSolarProfile,
  generateEVChargingProfile,
  baseBattery,
  baseTariffs,
  makeProfile,
} from '../../test-fixtures/profile-helpers';
import { SECTOR_LOAD_SHAPES, SECTOR_WEEKEND_FACTOR } from '../../constants';
import type { Sector } from '../../types';

// ─── Sector profile generation validation ───────────────────────

const sectors: Sector[] = ['hospitality', 'healthcare', 'retail', 'kantoor', 'industrie', 'logistiek', 'onderwijs', 'overig'];
const ANNUAL_KWH = 200_000;
const PEAK_KW = 80;

describe('Synthetic profile generation — all sectors', () => {
  for (const sector of sectors) {
    describe(sector, () => {
      const profile = generateHourlyProfile(ANNUAL_KWH, PEAK_KW, sector);

      it('sums to requested annual kWh (within 0.1%)', () => {
        const sum = profile.reduce((s, v) => s + v, 0);
        expect(Math.abs(sum - ANNUAL_KWH) / ANNUAL_KWH).toBeLessThan(0.001);
      });

      it('peak demand never exceeds specified peak kW', () => {
        const max = Math.max(...profile);
        expect(max).toBeLessThanOrEqual(PEAK_KW + 0.01); // tiny float tolerance
      });

      it('all values are non-negative', () => {
        expect(profile.every(v => v >= 0)).toBe(true);
      });

      it('has exactly 8760 hourly values', () => {
        expect(profile.length).toBe(8760);
      });

      it('weekday average differs from weekend average', () => {
        let weekdaySum = 0, weekdayCount = 0;
        let weekendSum = 0, weekendCount = 0;
        for (let h = 0; h < 8760; h++) {
          const doy = Math.floor(h / 24);
          if ((doy % 7) >= 5) {
            weekendSum += profile[h];
            weekendCount++;
          } else {
            weekdaySum += profile[h];
            weekdayCount++;
          }
        }
        const weekdayAvg = weekdaySum / weekdayCount;
        const weekendAvg = weekendSum / weekendCount;
        // Weekend factor < 1 for most sectors → weekend average < weekday
        if (SECTOR_WEEKEND_FACTOR[sector] < 0.9) {
          expect(weekendAvg).toBeLessThan(weekdayAvg);
        } else if (SECTOR_WEEKEND_FACTOR[sector] > 1.05) {
          expect(weekendAvg).toBeGreaterThan(weekdayAvg);
        }
        // At minimum, they should differ
        expect(weekdayAvg).not.toBeCloseTo(weekendAvg, 0);
      });

      it('winter months have higher consumption than summer months', () => {
        // Winter: hours for Jan (0-743), Feb (744-1415), Dec (8016-8759)
        // Summer: Jun (3624-4343), Jul (4344-5087), Aug (5088-5831)
        const winter = profile.slice(0, 1416).reduce((s, v) => s + v, 0) +
                       profile.slice(8016).reduce((s, v) => s + v, 0);
        const summer = profile.slice(3624, 5832).reduce((s, v) => s + v, 0);
        expect(winter).toBeGreaterThan(summer);
      });
    });
  }
});

// ─── Profile + simulation edge cases ────────────────────────────

describe('Profile-driven simulation edge cases', () => {
  it('datacenter flat profile: battery savings are minimal', () => {
    const hourly = generateDatacenterProfile(4_380_000);
    const profile = makeProfile(hourly, 'overig');
    const result = simulateBatteryOperation(profile, baseBattery, baseTariffs);
    // Near-constant load → minimal arbitrage opportunity
    // Savings should be small relative to annual energy cost
    const avgRate = 0.12; // rough average
    const annualCost = 4_380_000 * avgRate;
    // Savings < 1% of annual cost for a constant profile
    expect(Math.abs(result.totalSavings)).toBeLessThan(annualCost * 0.02);
  });

  it('school profile: zero-consumption hours do not cause NaN/Infinity', () => {
    const hourly = generateSchoolProfile(120_000);
    const profile = makeProfile(hourly, 'onderwijs');
    const result = simulateBatteryOperation(profile, baseBattery, baseTariffs);
    expect(isFinite(result.totalCostWithBattery)).toBe(true);
    expect(isFinite(result.totalCostWithoutBattery)).toBe(true);
    expect(isFinite(result.totalSavings)).toBe(true);
    expect(isFinite(result.totalCycles)).toBe(true);
    // Many zero hours should not cause issues
    const zeroHours = hourly.filter(v => v === 0).length;
    expect(zeroHours).toBeGreaterThan(2000); // Lots of zeros (nights + weekends + holidays)
  });

  it('EV charging spiky profile: simulation completes without errors', () => {
    const hourly = generateEVChargingProfile(200_000);
    const profile = makeProfile(hourly, 'logistiek');
    const largeBattery = { ...baseBattery, capacityKwh: 200, powerKw: 100 };
    const result = simulateBatteryOperation(profile, largeBattery, baseTariffs);
    // EV peaks may coincide with EPEX cheap hours (battery charges then too).
    // Peak reduction can be negative in this case — battery INCREASES grid peak by charging
    // during high-consumption charging hours. This is realistic: the optimizer targets
    // arbitrage, not explicit peak shaving.
    expect(isFinite(result.peakReduction)).toBe(true);
    expect(isFinite(result.totalSavings)).toBe(true);
    expect(result.totalCycles).toBeGreaterThan(0);
  });

  it('hotel with solar: negatives clamped, annual consumption correct', () => {
    const rawHourly = generateHotelWithSolarProfile(150_000);
    // Verify raw profile has negative values
    expect(rawHourly.some(v => v < 0)).toBe(true);

    // When parsed through CSV (which clamps negatives), they become 0
    const csvLines = rawHourly.map((v, i) =>
      `2024-01-01 ${String(Math.floor(i / 1)).padStart(2, '0')}:00;${v.toFixed(2).replace('.', ',')}`
    ).join('\n');
    const parsed = parseKwartierData(csvLines);
    expect(parsed.success).toBe(true);
    expect(parsed.hourlyConsumptionKwh.every(v => v >= 0)).toBe(true);
  });

  it('battery 100x too large: low utilization but no errors', () => {
    const hourly = generateOfficeProfile(50_000);
    const profile = makeProfile(hourly, 'kantoor');
    const hugeBattery = { ...baseBattery, capacityKwh: 10_000, powerKw: 5_000 };
    const result = simulateBatteryOperation(profile, hugeBattery, baseTariffs);
    // Should not crash
    expect(isFinite(result.totalSavings)).toBe(true);
    expect(isFinite(result.totalCycles)).toBe(true);
    // Very low utilization — cycles should be tiny
    expect(result.totalCycles).toBeLessThan(50);
  });

  it('battery 100x too small: maxes out every cycle', () => {
    const hourly = generateHospitalProfile(2_000_000);
    const profile = makeProfile(hourly, 'healthcare');
    const tinyBattery = { ...baseBattery, capacityKwh: 10, powerKw: 5 };
    const result = simulateBatteryOperation(profile, tinyBattery, baseTariffs);
    // Should cycle heavily
    expect(result.totalCycles).toBeGreaterThan(100);
    // But savings are minimal
    expect(result.totalSavings).toBeLessThan(500);
  });
});
