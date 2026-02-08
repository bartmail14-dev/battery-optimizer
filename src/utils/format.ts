/**
 * Formatting utilities for Dutch locale display.
 * All formatting is display-only — calculations use raw numbers.
 */

/**
 * Formats a number as Dutch currency: € 1.234,56
 */
export function formatEuro(value: number, decimals: number = 0): string {
  if (!isFinite(value)) return '—';
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Formats a number in Dutch notation: 1.234,56
 */
export function formatNumber(value: number, decimals: number = 0): string {
  if (!isFinite(value)) return '—';
  return new Intl.NumberFormat('nl-NL', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Formats a decimal as percentage: 12,5%
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  if (!isFinite(value)) return '—';
  return new Intl.NumberFormat('nl-NL', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Formats years with one decimal: 6,3 jaar
 */
export function formatYears(value: number): string {
  if (!isFinite(value)) return '> 20 jaar';
  return `${formatNumber(value, 1)} jaar`;
}

/**
 * Formats kWh values with appropriate unit (kWh or MWh)
 */
export function formatEnergy(kWh: number): string {
  if (!isFinite(kWh)) return '—';
  if (Math.abs(kWh) >= 1000) {
    return `${formatNumber(kWh / 1000, 1)} MWh`;
  }
  return `${formatNumber(kWh, 0)} kWh`;
}

/**
 * Formats kW values
 */
export function formatPower(kW: number): string {
  if (!isFinite(kW)) return '—';
  return `${formatNumber(kW, 0)} kW`;
}
