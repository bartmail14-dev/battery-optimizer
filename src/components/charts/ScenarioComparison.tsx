import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { ScenarioResult } from '../../types';
import { formatEuro, formatNumber } from '../../utils/format';
import { InfoTooltip } from '../shared';

interface ScenarioComparisonProps {
  scenarios: ScenarioResult[];
}

const SCENARIO_LABELS: Record<string, string> = {
  optimistic: 'Optimistisch',
  base: 'Basis',
  pessimistic: 'Pessimistisch',
};

// ColorBrewer accessible colors
const COLORS = {
  optimistic: '#2b8cbe',
  base: '#41ab5d',
  pessimistic: '#ef6548',
};

/** Clamp Infinity/NaN to 0 for safe chart rendering */
function safeValue(v: number): number {
  return isFinite(v) ? Math.round(v * 100) / 100 : 0;
}

/**
 * Scenario comparison with separate charts for EUR and years metrics.
 * Avoids mixing different units on the same Y-axis.
 */
export function ScenarioComparison({ scenarios }: ScenarioComparisonProps) {
  if (!scenarios || scenarios.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-800">Scenariovergelijking</h3>
        <p className="mt-4 text-center text-sm text-gray-400">Geen scenariodata beschikbaar</p>
      </div>
    );
  }

  const eurMetrics = [
    { key: 'npv' as const, label: 'NPV', format: (v: number) => formatEuro(v) },
    { key: 'annualSavings' as const, label: 'Jaarlijkse besparing', format: (v: number) => formatEuro(v) },
  ];
  const yearsMetric = {
    key: 'simplePayback' as const,
    label: 'Terugverdientijd',
    format: (v: number) => isFinite(v) ? `${formatNumber(v, 1)} jr` : '> 20 jr',
  };

  const eurChartData = eurMetrics.map((metric) => {
    const row: Record<string, string | number> = { metric: metric.label };
    for (const s of scenarios) {
      row[s.scenario] = safeValue(s[metric.key]);
    }
    return row;
  });

  const yearsChartData = [{
    metric: yearsMetric.label,
    ...Object.fromEntries(
      scenarios.map((s) => [s.scenario, safeValue(s[yearsMetric.key])])
    ),
  }];

  const allMetrics = [...eurMetrics, yearsMetric];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-800">
          Scenariovergelijking
        </h3>
        <InfoTooltip text="Drie scenario's met verschillende aannames over energieprijzen, batterijkosten en rente. Het basisscenario gebruikt de meest waarschijnlijke waarden. Optimistisch en pessimistisch tonen de bandbreedte." />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* EUR metrics chart */}
        <div>
          <p className="mb-2 text-xs font-medium text-gray-500">Financieel (EUR)</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={eurChartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="metric" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 10 }}
                tickFormatter={(v: number) =>
                  Math.abs(v) >= 1000 ? `€${Math.round(v / 1000)}k` : `€${Math.round(v)}`
                }
              />
              <Tooltip
                formatter={(value, name) => [
                  formatEuro(Number(value ?? 0)),
                  SCENARIO_LABELS[String(name)] ?? String(name),
                ]}
              />
              <Legend formatter={(value: string) => SCENARIO_LABELS[value] ?? value} />
              <Bar dataKey="optimistic" fill={COLORS.optimistic} radius={[4, 4, 0, 0]} />
              <Bar dataKey="base" fill={COLORS.base} radius={[4, 4, 0, 0]} />
              <Bar dataKey="pessimistic" fill={COLORS.pessimistic} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Years metric chart */}
        <div>
          <p className="mb-2 text-xs font-medium text-gray-500">Terugverdientijd (jaren)</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={yearsChartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="metric" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 10 }}
                tickFormatter={(v: number) => `${formatNumber(v, 1)} jr`}
              />
              <Tooltip
                formatter={(value, name) => [
                  isFinite(Number(value)) ? `${formatNumber(Number(value ?? 0), 1)} jaar` : '> 20 jaar',
                  SCENARIO_LABELS[String(name)] ?? String(name),
                ]}
              />
              <Legend formatter={(value: string) => SCENARIO_LABELS[value] ?? value} />
              <Bar dataKey="optimistic" fill={COLORS.optimistic} radius={[4, 4, 0, 0]} />
              <Bar dataKey="base" fill={COLORS.base} radius={[4, 4, 0, 0]} />
              <Bar dataKey="pessimistic" fill={COLORS.pessimistic} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed table below charts */}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="py-2 text-left font-medium text-gray-500">Metric</th>
              {scenarios.map((s) => (
                <th key={s.scenario} className="py-2 text-right font-medium text-gray-500">
                  {SCENARIO_LABELS[s.scenario]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allMetrics.map((metric) => (
              <tr key={metric.key} className="border-b border-gray-100">
                <td className="py-2 text-gray-700">{metric.label}</td>
                {scenarios.map((s) => (
                  <td key={s.scenario} className="py-2 text-right font-mono text-gray-800">
                    {metric.format(s[metric.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
