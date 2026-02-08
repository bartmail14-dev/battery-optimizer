import { describe, it, expect } from 'vitest';
import { formatEuro, formatNumber, formatPercentage, formatYears, formatEnergy, formatPower } from './format';

describe('formatEuro', () => {
  it('formats positive amounts', () => {
    const result = formatEuro(1234);
    expect(result).toContain('1.234');
    expect(result).toContain('€');
  });

  it('formats negative amounts', () => {
    const result = formatEuro(-5000);
    expect(result).toContain('5.000');
  });

  it('handles zero', () => {
    const result = formatEuro(0);
    expect(result).toContain('0');
  });

  it('handles Infinity', () => {
    expect(formatEuro(Infinity)).toBe('—');
  });

  it('handles NaN', () => {
    expect(formatEuro(NaN)).toBe('—');
  });

  it('respects decimal places', () => {
    const result = formatEuro(1234.56, 2);
    expect(result).toContain('1.234,56');
  });
});

describe('formatNumber', () => {
  it('formats with Dutch notation', () => {
    expect(formatNumber(1234567)).toContain('1.234.567');
  });

  it('handles decimals', () => {
    expect(formatNumber(1234.5, 1)).toContain('1.234,5');
  });
});

describe('formatPercentage', () => {
  it('formats decimals as percentage', () => {
    const result = formatPercentage(0.125);
    expect(result).toContain('12,5');
    expect(result).toContain('%');
  });

  it('handles Infinity', () => {
    expect(formatPercentage(Infinity)).toBe('—');
  });
});

describe('formatYears', () => {
  it('formats normal values', () => {
    expect(formatYears(6.3)).toContain('6,3');
    expect(formatYears(6.3)).toContain('jaar');
  });

  it('handles Infinity', () => {
    expect(formatYears(Infinity)).toBe('> 20 jaar');
  });
});

describe('formatEnergy', () => {
  it('uses kWh for small values', () => {
    expect(formatEnergy(500)).toContain('kWh');
  });

  it('uses MWh for large values', () => {
    const result = formatEnergy(2000);
    expect(result).toContain('MWh');
  });

  it('handles Infinity', () => {
    expect(formatEnergy(Infinity)).toBe('—');
  });
});

describe('formatPower', () => {
  it('formats with kW unit', () => {
    expect(formatPower(250)).toContain('250');
    expect(formatPower(250)).toContain('kW');
  });

  it('handles NaN', () => {
    expect(formatPower(NaN)).toBe('—');
  });

  it('handles Infinity', () => {
    expect(formatPower(Infinity)).toBe('—');
  });

  it('handles negative infinity', () => {
    expect(formatPower(-Infinity)).toBe('—');
  });

  it('formats zero', () => {
    expect(formatPower(0)).toContain('0');
    expect(formatPower(0)).toContain('kW');
  });

  it('formats large values with thousand separator', () => {
    expect(formatPower(1500)).toContain('1.500');
  });
});

// --- Extended edge cases ---

describe('formatEuro extended', () => {
  it('handles negative infinity', () => {
    expect(formatEuro(-Infinity)).toBe('—');
  });

  it('formats very large numbers', () => {
    const result = formatEuro(1000000);
    expect(result).toContain('1.000.000');
  });

  it('formats small decimal with 2 decimals', () => {
    const result = formatEuro(0.99, 2);
    expect(result).toContain('0,99');
  });

  it('rounds correctly with 0 decimals', () => {
    const result = formatEuro(1234.7);
    expect(result).toContain('1.235');
  });
});

describe('formatNumber extended', () => {
  it('handles NaN', () => {
    expect(formatNumber(NaN)).toBe('—');
  });

  it('handles Infinity', () => {
    expect(formatNumber(Infinity)).toBe('—');
  });

  it('handles negative infinity', () => {
    expect(formatNumber(-Infinity)).toBe('—');
  });

  it('formats zero', () => {
    expect(formatNumber(0)).toBe('0');
  });

  it('formats negative numbers', () => {
    expect(formatNumber(-1234)).toContain('1.234');
  });

  it('formats with multiple decimal places', () => {
    const result = formatNumber(1234.5678, 3);
    expect(result).toContain('1.234,568');
  });

  it('default 0 decimals rounds correctly', () => {
    expect(formatNumber(99.9)).toBe('100');
  });
});

describe('formatPercentage extended', () => {
  it('handles NaN', () => {
    expect(formatPercentage(NaN)).toBe('—');
  });

  it('handles negative infinity', () => {
    expect(formatPercentage(-Infinity)).toBe('—');
  });

  it('formats zero', () => {
    const result = formatPercentage(0);
    expect(result).toContain('0');
    expect(result).toContain('%');
  });

  it('formats 100%', () => {
    const result = formatPercentage(1);
    expect(result).toContain('100');
  });

  it('formats negative percentage', () => {
    const result = formatPercentage(-0.05);
    expect(result).toContain('5');
  });

  it('formats very small percentage', () => {
    const result = formatPercentage(0.001, 2);
    expect(result).toContain('0,10');
  });

  it('respects custom decimals', () => {
    const result = formatPercentage(0.12345, 3);
    expect(result).toContain('12,345');
  });
});

describe('formatYears extended', () => {
  it('handles NaN', () => {
    expect(formatYears(NaN)).toBe('> 20 jaar');
  });

  it('handles negative infinity', () => {
    expect(formatYears(-Infinity)).toBe('> 20 jaar');
  });

  it('formats zero years', () => {
    const result = formatYears(0);
    expect(result).toContain('0');
    expect(result).toContain('jaar');
  });

  it('formats negative years', () => {
    const result = formatYears(-1.5);
    expect(result).toContain('1,5');
    expect(result).toContain('jaar');
  });

  it('formats large but finite years', () => {
    const result = formatYears(25);
    expect(result).toContain('25');
    expect(result).toContain('jaar');
  });
});

describe('formatEnergy extended', () => {
  it('handles NaN', () => {
    expect(formatEnergy(NaN)).toBe('—');
  });

  it('handles negative infinity', () => {
    expect(formatEnergy(-Infinity)).toBe('—');
  });

  it('formats zero', () => {
    const result = formatEnergy(0);
    expect(result).toContain('0');
    expect(result).toContain('kWh');
  });

  it('formats exactly 1000 kWh as MWh', () => {
    const result = formatEnergy(1000);
    expect(result).toContain('MWh');
    expect(result).toContain('1,0');
  });

  it('formats 999 kWh as kWh', () => {
    const result = formatEnergy(999);
    expect(result).toContain('kWh');
    expect(result).toContain('999');
  });

  it('formats negative values correctly', () => {
    const result = formatEnergy(-1500);
    expect(result).toContain('MWh');
  });

  it('formats very large values', () => {
    const result = formatEnergy(1000000);
    expect(result).toContain('MWh');
    expect(result).toContain('1.000');
  });
});
