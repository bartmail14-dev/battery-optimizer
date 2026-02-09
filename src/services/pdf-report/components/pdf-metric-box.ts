import { View, Text } from '@react-pdf/renderer';
import { createElement } from 'react';
import { styles } from '../styles';

export function createMetricBox(value: string, label: string, variant: 'default' | 'green' | 'red' = 'default') {
  const boxStyle = variant === 'green' ? styles.metricBoxGreen
    : variant === 'red' ? styles.metricBoxRed
    : styles.metricBox;

  const valueStyle = variant === 'green' ? styles.metricValueGreen
    : variant === 'red' ? styles.metricValueRed
    : styles.metricValue;

  return createElement(View, { style: boxStyle },
    createElement(Text, { style: valueStyle }, value),
    createElement(Text, { style: styles.metricLabel }, label),
  );
}

export function createMetricsRow(metrics: Array<{ value: string; label: string; variant?: 'default' | 'green' | 'red' }>) {
  return createElement(View, { style: styles.metricsRow },
    ...metrics.map((m) => createMetricBox(m.value, m.label, m.variant ?? 'default')),
  );
}
