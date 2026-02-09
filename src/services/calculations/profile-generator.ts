import type { Sector } from '../../types/index.js';
import { SECTOR_LOAD_SHAPES, SECTOR_WEEKEND_FACTOR } from '../../constants/index.js';
import { MONTHLY_SEASONAL_FACTORS } from '../../constants/seasonal-factors.js';

/**
 * Generates a synthetic hourly consumption profile based on annual totals.
 * Creates a realistic daily pattern for the given sector using NEDU-based load shapes.
 */
export function generateHourlyProfile(
  annualKwh: number,
  peakKw: number,
  sector: Sector
): number[] {
  const hours = new Array(8760).fill(0);
  const avgHourly = annualKwh / 8760;

  const loadShape = SECTOR_LOAD_SHAPES[sector];
  const weekendFactor = SECTOR_WEEKEND_FACTOR[sector];

  // Normalize load shape to average 1.0
  const shapeAvg = loadShape.reduce((s, v) => s + v, 0) / 24;
  const normalized = loadShape.map(v => v / shapeAvg);

  for (let h = 0; h < 8760; h++) {
    const hourOfDay = h % 24;
    const dayOfYear = Math.floor(h / 24);
    const isWeekend = (dayOfYear % 7) >= 5;

    let multiplier = normalized[hourOfDay];

    // Weekend adjustment
    if (isWeekend) {
      multiplier *= weekendFactor;
    }

    // Seasonal variation (higher in winter for heating, summer for cooling)
    const month = Math.floor(dayOfYear / 30.44);
    const seasonalFactor = MONTHLY_SEASONAL_FACTORS[month] ?? 1.0;

    hours[h] = Math.min(avgHourly * multiplier * seasonalFactor, peakKw);
  }

  // Scale to match annual total
  const totalGenerated = hours.reduce((s, v) => s + v, 0);
  const scaleFactor = totalGenerated > 0 ? annualKwh / totalGenerated : 1;

  return hours.map(h => h * scaleFactor);
}
