import type { Fill, Font, Border, Alignment } from 'exceljs';

/** COMCAM brand colors for Excel */
export const EXCEL_COLORS = {
  primary: '2563EB',
  primaryLight: 'EFF6FF',
  primaryDark: '1E3A5F',
  green: '16A34A',
  greenLight: 'F0FDF4',
  red: 'DC2626',
  redLight: 'FEF2F2',
  white: 'FFFFFF',
  gray: 'F9FAFB',
  grayBorder: 'E5E7EB',
  text: '1F2937',
  textLight: '6B7280',
};

export const headerFill: Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: EXCEL_COLORS.primary },
};

export const headerFont: Partial<Font> = {
  bold: true,
  color: { argb: EXCEL_COLORS.white },
  size: 11,
};

export const titleFont: Partial<Font> = {
  bold: true,
  size: 14,
  color: { argb: EXCEL_COLORS.primaryDark },
};

export const subtitleFont: Partial<Font> = {
  bold: true,
  size: 11,
  color: { argb: EXCEL_COLORS.text },
};

export const bodyFont: Partial<Font> = {
  size: 10,
  color: { argb: EXCEL_COLORS.text },
};

export const lightFill: Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: EXCEL_COLORS.primaryLight },
};

export const greenFill: Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: EXCEL_COLORS.greenLight },
};

export const redFill: Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: EXCEL_COLORS.redLight },
};

export const thinBorder: Partial<Border> = {
  style: 'thin',
  color: { argb: EXCEL_COLORS.grayBorder },
};

export const cellBorders: Partial<{ top: Partial<Border>; left: Partial<Border>; bottom: Partial<Border>; right: Partial<Border> }> = {
  top: thinBorder,
  left: thinBorder,
  bottom: thinBorder,
  right: thinBorder,
};

export const rightAlign: Partial<Alignment> = { horizontal: 'right' };
export const centerAlign: Partial<Alignment> = { horizontal: 'center' };

export const euroFormat = '#.##0\\ "\\u20AC";[Red]-#.##0\\ "\\u20AC"';
export const euroFormat2 = '#.##0,00\\ "\\u20AC";[Red]-#.##0,00\\ "\\u20AC"';
export const pctFormat = '0,0%';
export const numFormat = '#.##0';
export const num1Format = '#.##0,0';
