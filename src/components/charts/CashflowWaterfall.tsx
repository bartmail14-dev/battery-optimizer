import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { YearlyBreakdown } from '../../types';
import { formatEuro } from '../../utils/format';
import { InfoTooltip } from '../shared';

interface CashflowWaterfallProps {
  yearlyBreakdown: YearlyBreakdown[];
}

interface ChartDataPoint {
  jaar: string;
  besparing: number;
  subsidie: number;
  onderhoud: number;
  cumulatief: number;
}

export function CashflowWaterfall({ yearlyBreakdown }: CashflowWaterfallProps) {
  if (!yearlyBreakdown || yearlyBreakdown.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-800">Cashflow waterval per jaar</h3>
        <p className="mt-4 text-center text-sm text-gray-400">Geen jaarlijkse data beschikbaar</p>
      </div>
    );
  }

  const data: ChartDataPoint[] = yearlyBreakdown.map((yb) => ({
    jaar: `Jaar ${yb.year}`,
    besparing: Math.round(yb.grossSavings),
    subsidie: Math.round(yb.subsidy),
    onderhoud: -Math.abs(Math.round(yb.maintenance)),
    cumulatief: Math.round(yb.cumulativeCashflow),
  }));

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-800">
          Cashflow waterval per jaar
        </h3>
        <InfoTooltip text="Gestapelde cashflow per jaar: besparingen (groen), SDE++ subsidie (teal) en onderhoudskosten (rood). De lijn toont het cumulatieve verloop." />
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="jaar" tick={{ fontSize: 11 }} />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) =>
              Math.abs(v) >= 1000
                ? `\u20AC${Math.round(v / 1000)}k`
                : `\u20AC${Math.round(v)}`
            }
            label={{
              value: 'EUR',
              angle: -90,
              position: 'insideLeft',
              offset: 0,
              fontSize: 13,
            }}
          />
          <Tooltip
            formatter={(value: number | undefined, name: string | undefined) => {
              const v = Number(value ?? 0);
              const n = String(name);
              const labels: Record<string, string> = {
                besparing: 'Besparing',
                subsidie: 'SDE++',
                onderhoud: 'Onderhoud',
                cumulatief: 'Cumulatief',
              };
              return [formatEuro(v), labels[n] ?? n];
            }}
            labelFormatter={(label) => String(label)}
          />
          <Legend
            formatter={(value: string) => {
              const labels: Record<string, string> = {
                besparing: 'Besparing',
                subsidie: 'SDE++',
                onderhoud: 'Onderhoud',
                cumulatief: 'Cumulatief',
              };
              return labels[value] ?? value;
            }}
          />
          <Bar
            dataKey="besparing"
            stackId="cf"
            fill="#22c55e"
            name="besparing"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="subsidie"
            stackId="cf"
            fill="#14b8a6"
            name="subsidie"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="onderhoud"
            stackId="cf"
            fill="#ef4444"
            name="onderhoud"
            radius={[4, 4, 0, 0]}
          />
          <Line
            type="monotone"
            dataKey="cumulatief"
            stroke="#1e3a8a"
            strokeWidth={2.5}
            dot={{ r: 3 }}
            name="cumulatief"
          />
        </ComposedChart>
      </ResponsiveContainer>

      <p className="mt-2 text-xs text-gray-400">
        Indicatief — gebaseerd op het basisscenario met verwachte degradatie. Werkelijke cashflows kunnen afwijken.
      </p>
    </div>
  );
}
