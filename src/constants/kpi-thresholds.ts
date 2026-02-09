/**
 * KPI assessment thresholds for dashboard metric cards.
 *
 * Used to determine positive/neutral/negative status coloring.
 * All values are configurable business rules, not hardcoded into components.
 */

export const KPI_THRESHOLDS = {
  /** Battery utilization (percentage) */
  utilization: {
    /** Green zone: well-utilized */
    optimal: { min: 60, max: 90 },
    /** Amber zone: acceptable */
    acceptable: { min: 30, max: 90 },
  },

  /** Average charge/discharge cycles per day */
  cyclesPerDay: {
    optimal: { min: 0.5, max: 1.5 },
  },

  /** Efficiency performance — fraction of theoretical round-trip efficiency */
  efficiencyPerformance: 0.95,

  /** Grid independence: fraction of total consumption served by battery */
  gridIndependence: {
    positive: 0.15,
    neutral: 0.05,
  },

  /** Peak hour coverage: fraction of peak-hour consumption served by battery */
  peakHourCoverage: {
    positive: 0.20,
    neutral: 0.10,
  },

  /** Payback confidence range thresholds (years) */
  paybackConfidence: {
    /** ≤ high years spread → "hoog" confidence */
    high: 2,
    /** ≤ medium years spread → "midden" confidence */
    medium: 5,
  },

  /** Max daily throughput operational window (hours) */
  maxDailyOperationalHours: 12,
} as const;
