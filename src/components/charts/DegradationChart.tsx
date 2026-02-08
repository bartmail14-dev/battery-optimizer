import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { YearlyBreakdown } from '../../types';
import { formatEuro, formatPercentage } from '../../utils/format';
import { InfoTooltip } from '../shared';

interface DegradationChartProps {
  yearlyBreakdown: YearlyBreakdown[];
}

interface ChartDataPoint {
  jaar: string;
  cashflow: number;
  cumulatief: number;
  degradatie: number;
}

export function DegradationChart({ yearlyBreakdown }: DegradationChartProps) {
  if (!yearlyBreakdown || yearlyBreakdown.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-800">Degradatie en cashflow over tijd</h3>
        <p className="mt-4 text-center text-sm text-gray-400">Geen jaarlijkse data beschikbaar</p>
      </div>
    );
  }

  const data: ChartDataPoint[] = yearlyBreakdown.map((yb) => ({
    jaar: `Jaar ${yb.year}`,
    cashflow: Math.round(yb.netCashflow),
    cumulatief: Math.round(yb.cumulativeCashflow),
    degradatie: Math.round(yb.degradationFactor * 1000) / 10, // as percentage (0-100)
  }));

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-800">
          Degradatie en cashflow over tijd
        </h3>
        <InfoTooltip text="Toont hoe batterijdegradatie de jaarlijkse cashflow beinvloedt. De balken zijn de netto cashflow per jaar, de blauwe lijn het cumulatieve resultaat, en de stippellijn het resterende batterijcapaciteitspercentage." />
      </div>

      <p className="mb-2 text-xs text-gray-400">Indicatieve projectie op basis van aannames over degradatie, prijsgroei en marktcondities.</p>

      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart data={data} margin={{ top: 10, right: 60, left: 20, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="jaar"
            tick={{ fontSize: 11 }}
          />
          <YAxis
            yAxisId="eur"
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) =>
              Math.abs(v) >= 1000 ? `\u20AC${Math.round(v / 1000)}k` : `\u20AC${Math.round(v)}`
            }
            label={{ value: 'EUR', angle: -90, position: 'insideLeft', offset: 0, fontSize: 13 }}
          />
          <YAxis
            yAxisId="pct"
            orientation="right"
            domain={[0, 100]}
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) => `${v}%`}
            label={{ value: 'Capaciteit (%)', angle: 90, position: 'insideRight', offset: 10, fontSize: 13 }}
          />
          <Tooltip
            formatter={(value: number | undefined, name: string | undefined) => {
              const v = Number(value ?? 0);
              const n = String(name);
              if (n === 'degradatie') return [formatPercentage(v / 100, 1), 'Restcapaciteit'];
              if (n === 'cumulatief') return [formatEuro(v), 'Cumulatief'];
              return [formatEuro(v), 'Netto cashflow'];
            }}
            labelFormatter={(label) => String(label)}
          />
          <Legend
            formatter={(value: string) => {
              if (value === 'degradatie') return 'Restcapaciteit';
              if (value === 'cumulatief') return 'Cumulatief';
              return 'Netto cashflow';
            }}
          />
          <ReferenceLine yAxisId="eur" y={0} stroke="#6b7280" strokeDasharray="4 4" label="Break-even" />
          <Bar dataKey="cashflow" yAxisId="eur" name="cashflow" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.cashflow >= 0 ? '#22c55e' : '#ef4444'} />
            ))}
          </Bar>
          <Line
            type="monotone"
            dataKey="cumulatief"
            yAxisId="eur"
            stroke="#1e40af"
            strokeWidth={2.5}
            dot={{ r: 3 }}
            name="cumulatief"
          />
          <Line
            type="monotone"
            dataKey="degradatie"
            yAxisId="pct"
            stroke="#f59e0b"
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={false}
            name="degradatie"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
