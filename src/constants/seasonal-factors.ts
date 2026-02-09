/**
 * Monthly seasonal correction factors for synthetic load profile generation.
 *
 * Index 0 = January, Index 11 = December.
 * > 1.0 = higher consumption (winter heating, lighting)
 * < 1.0 = lower consumption (summer, longer daylight)
 *
 * Bron: NEDU standaardprofielen, CBS energiemonitor
 */
export const MONTHLY_SEASONAL_FACTORS = [
  1.15, // Januari — winterpiek
  1.10, // Februari
  1.00, // Maart — overgang
  0.90, // April
  0.85, // Mei — zomerdal
  0.90, // Juni
  0.95, // Juli
  0.95, // Augustus
  0.90, // September
  1.00, // Oktober — overgang
  1.10, // November
  1.15, // December — winterpiek
] as const;
