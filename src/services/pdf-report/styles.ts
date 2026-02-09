import { StyleSheet } from '@react-pdf/renderer';

/** COMCAM brand colors */
export const COLORS = {
  primary: '#2563eb',
  primaryLight: '#eff6ff',
  primaryDark: '#1e3a5f',
  text: '#1f2937',
  textLight: '#6b7280',
  textMuted: '#9ca3af',
  green: '#16a34a',
  greenBg: '#f0fdf4',
  red: '#dc2626',
  redBg: '#fef2f2',
  amber: '#d97706',
  amberBg: '#fef3c7',
  amberText: '#92400e',
  border: '#e5e7eb',
  borderDark: '#374151',
  white: '#ffffff',
  grayBg: '#f9fafb',
};

export const styles = StyleSheet.create({
  page: {
    padding: 40,
    paddingBottom: 60,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: COLORS.text,
  },
  // --- Header / Footer ---
  header: {
    marginBottom: 20,
    borderBottom: `2 solid ${COLORS.primary}`,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  brandName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  brandSub: {
    fontSize: 8,
    color: COLORS.textLight,
    marginTop: 2,
  },
  pageNumber: {
    fontSize: 8,
    color: COLORS.textLight,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    fontSize: 7,
    color: COLORS.textMuted,
    textAlign: 'center',
    borderTop: `1 solid ${COLORS.border}`,
    paddingTop: 6,
  },
  // --- Titles ---
  pageTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primaryDark,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.borderDark,
    marginTop: 14,
    marginBottom: 6,
  },
  // --- Body text ---
  text: {
    fontSize: 10,
    lineHeight: 1.5,
    marginBottom: 4,
  },
  textSmall: {
    fontSize: 8,
    lineHeight: 1.4,
    color: COLORS.textLight,
  },
  // --- Metric boxes ---
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  metricBox: {
    flex: 1,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 6,
    padding: 10,
    alignItems: 'center',
  },
  metricBoxGreen: {
    flex: 1,
    backgroundColor: COLORS.greenBg,
    borderRadius: 6,
    padding: 10,
    alignItems: 'center',
  },
  metricBoxRed: {
    flex: 1,
    backgroundColor: COLORS.redBg,
    borderRadius: 6,
    padding: 10,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  metricValueGreen: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.green,
  },
  metricValueRed: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.red,
  },
  metricLabel: {
    fontSize: 7,
    color: COLORS.textLight,
    marginTop: 3,
    textAlign: 'center',
  },
  // --- Tables ---
  table: {
    marginTop: 8,
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottom: `2 solid ${COLORS.borderDark}`,
    paddingVertical: 4,
    backgroundColor: COLORS.primaryLight,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: `1 solid ${COLORS.border}`,
    paddingVertical: 3,
  },
  tableRowAlt: {
    flexDirection: 'row',
    borderBottom: `1 solid ${COLORS.border}`,
    paddingVertical: 3,
    backgroundColor: COLORS.grayBg,
  },
  tableCell: {
    flex: 1,
    fontSize: 8,
    paddingHorizontal: 4,
  },
  tableCellRight: {
    flex: 1,
    fontSize: 8,
    paddingHorizontal: 4,
    textAlign: 'right',
  },
  tableCellBold: {
    flex: 1,
    fontSize: 8,
    paddingHorizontal: 4,
    fontWeight: 'bold',
  },
  tableCellHeader: {
    flex: 1,
    fontSize: 8,
    paddingHorizontal: 4,
    fontWeight: 'bold',
    color: COLORS.primaryDark,
  },
  tableCellHeaderRight: {
    flex: 1,
    fontSize: 8,
    paddingHorizontal: 4,
    fontWeight: 'bold',
    color: COLORS.primaryDark,
    textAlign: 'right',
  },
  // --- Disclaimer ---
  disclaimer: {
    marginTop: 16,
    padding: 10,
    backgroundColor: COLORS.amberBg,
    borderRadius: 4,
    fontSize: 7,
    color: COLORS.amberText,
    lineHeight: 1.4,
  },
  // --- Cover page ---
  coverPage: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverBrand: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  coverSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 40,
  },
  coverTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.primaryDark,
    marginBottom: 12,
    textAlign: 'center',
  },
  coverMeta: {
    fontSize: 11,
    color: COLORS.textLight,
    marginBottom: 6,
    textAlign: 'center',
  },
  coverConfidential: {
    marginTop: 40,
    padding: 8,
    backgroundColor: COLORS.amberBg,
    borderRadius: 4,
    fontSize: 9,
    color: COLORS.amberText,
    textAlign: 'center',
  },
  // --- CTA ---
  ctaPage: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 20,
    textAlign: 'center',
  },
  ctaText: {
    fontSize: 12,
    color: COLORS.borderDark,
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 1.6,
  },
  ctaContact: {
    marginTop: 30,
    padding: 20,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  // --- Key-value row ---
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    borderBottom: `1 solid ${COLORS.border}`,
  },
  kvLabel: {
    fontSize: 9,
    color: COLORS.textLight,
  },
  kvValue: {
    fontSize: 9,
    fontWeight: 'bold',
    color: COLORS.text,
  },
});

// --- Formatters ---

export function fmtEuro(n: number): string {
  if (!isFinite(n)) return '\u2014';
  return `\u20AC ${n.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function fmtEuroCents(n: number): string {
  if (!isFinite(n)) return '\u2014';
  return `\u20AC ${n.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function fmtYears(n: number): string {
  if (!isFinite(n)) return '> 20 jaar';
  return `${n.toLocaleString('nl-NL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} jaar`;
}

export function fmtPct(n: number): string {
  if (!isFinite(n)) return '\u2014';
  return `${(n * 100).toLocaleString('nl-NL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

export function fmtNumber(n: number, decimals: number = 0): string {
  if (!isFinite(n)) return '\u2014';
  return n.toLocaleString('nl-NL', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function fmtKwh(n: number): string {
  if (!isFinite(n)) return '\u2014';
  if (Math.abs(n) >= 1000) {
    return `${(n / 1000).toLocaleString('nl-NL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} MWh`;
  }
  return `${n.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} kWh`;
}

export const SCENARIO_LABELS: Record<string, string> = {
  optimistic: 'Optimistisch',
  base: 'Basis',
  pessimistic: 'Pessimistisch',
};

export const MONTH_LABELS = [
  'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
  'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December',
];
