import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { MonthlyBreakdown } from '../../types';
import { formatEuro } from '../../utils/format';
import { InfoTooltip } from '../shared';

interface MonthlyBreakdownChartProps {
  data: MonthlyBreakdown[];
}

/** Smart EUR formatter that avoids "€0k" for small values */
function formatEurAxis(v: number): string {
  if (Math.abs(v) >= 1000) return `€${Math.round(v / 1000)}k`;
  return `€${Math.round(v)}`;
}

export function MonthlyBreakdownChart({ data }: MonthlyBreakdownChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-800">Maandelijks kostenverloop</h3>
        <p className="mt-4 text-center text-sm text-gray-400">Geen maanddata beschikbaar</p>
      </div>
    );
  }

  const chartData = data.map((m) => ({
    maand: m.label.slice(0, 3),
    'Zonder batterij': Math.round(m.costWithout),
    'Met batterij': Math.round(m.costWith),
    Besparing: Math.round(m.savings),
  }));

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-800">
          Maandelijks kostenverloop
        </h3>
        <InfoTooltip text="Vergelijking van de maandelijkse energiekosten met en zonder batterij. De groene balk toont de besparing per maand." />
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="maand" tick={{ fontSize: 11 }} />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={formatEurAxis}
            label={{ value: 'EUR', angle: -90, position: 'insideLeft', offset: 0, fontSize: 13 }}
          />
          <Tooltip
            formatter={(value: number | undefined, name: string | undefined) => [
              formatEuro(Number(value ?? 0)),
              String(name),
            ]}
          />
          <Legend />
          <Bar dataKey="Zonder batterij" fill="#94a3b8" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Met batterij" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Besparing" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={index} fill={entry.Besparing >= 0 ? '#22c55e' : '#ef4444'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
