import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { SensitivityDataPoint } from '../../types';
import { formatEuro, formatNumber } from '../../utils/format';
import { InfoTooltip } from '../shared';

interface SensitivityTornadoProps {
  data: SensitivityDataPoint[];
}

/**
 * Tornado chart showing sensitivity of NPV to different variables.
 * Sorted by impact (widest range at top).
 */
export function SensitivityTornado({ data }: SensitivityTornadoProps) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-800">Gevoeligheidsanalyse (Tornado)</h3>
        <p className="mt-4 text-center text-sm text-gray-400">Geen gevoeligheidsdata beschikbaar</p>
      </div>
    );
  }

  // Filter out entries with non-finite NPV values, then sort by impact
  const sorted = [...data]
    .filter((d) => isFinite(d.highNpv) && isFinite(d.lowNpv) && isFinite(d.baseNpv))
    .map((d) => ({
      ...d,
      impact: Math.abs(d.highNpv - d.lowNpv),
      lowDelta: d.lowNpv - d.baseNpv,
      highDelta: d.highNpv - d.baseNpv,
    }))
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 5); // Top 5 most impactful

  const chartData = sorted.map((d) => ({
    name: d.label,
    low: d.lowDelta,
    high: d.highDelta,
    lowValue: d.lowValue,
    highValue: d.highValue,
    baseNpv: d.baseNpv,
    unit: d.unit,
  }));

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-800">
          Gevoeligheidsanalyse (Tornado)
        </h3>
        <InfoTooltip text="Toont welke variabelen de grootste impact hebben op de NPV. Hoe breder de balk, hoe gevoeliger het resultaat is voor veranderingen in die variabele." />
      </div>

      <p className="mb-4 text-sm text-gray-500">
        Basis NPV: {formatEuro(sorted[0]?.baseNpv ?? 0)} — Balken tonen afwijking bij lage en hoge parameterwaarden
      </p>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 10, right: 40, left: 120, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            type="number"
            tickFormatter={(v: number) => formatEuro(v)}
            tick={{ fontSize: 11 }}
            label={{ value: 'Afwijking NPV (EUR)', position: 'insideBottom', offset: -5, fontSize: 13 }}
          />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={110} />
          <Tooltip
            formatter={(value, name) => [
              formatEuro(Number(value ?? 0)),
              name === 'low' ? 'Lage waarde' : 'Hoge waarde',
            ]}
            labelFormatter={(label) => String(label)}
          />
          <ReferenceLine x={0} stroke="#374151" strokeWidth={2} />
          <Bar dataKey="low" stackId="a">
            {chartData.map((entry, index) => (
              <Cell key={index} fill={entry.low < 0 ? '#ef4444' : '#22c55e'} />
            ))}
          </Bar>
          <Bar dataKey="high" stackId="a">
            {chartData.map((entry, index) => (
              <Cell key={index} fill={entry.high < 0 ? '#ef4444' : '#22c55e'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Parameter details */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-xs text-gray-600">
          <thead>
            <tr className="border-b">
              <th className="py-1 text-left">Variabele</th>
              <th className="py-1 text-right">Laag</th>
              <th className="py-1 text-right">Basis</th>
              <th className="py-1 text-right">Hoog</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((d) => (
              <tr key={d.variable} className="border-b border-gray-50">
                <td className="py-1">{d.label}</td>
                <td className="py-1 text-right font-mono">{formatNumber(d.lowValue, 2)} {d.unit}</td>
                <td className="py-1 text-right font-mono">{formatNumber(d.baseValue, 2)} {d.unit}</td>
                <td className="py-1 text-right font-mono">{formatNumber(d.highValue, 2)} {d.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
