import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { formatEuro } from '../../utils/format';
import { InfoTooltip } from '../shared';

interface SavingsChartProps {
  /** Annual cashflows (index 0 = year 0 investment) */
  cashflows: number[];
  /** Analysis horizon in years */
  years: number;
  /** Simple payback period in years */
  paybackYear?: number;
}

interface ChartDataPoint {
  year: number;
  label: string;
  withBattery: number;
  withoutBattery: number;
}

/**
 * Cumulative savings line chart: "met batterij" vs "zonder batterij" over time.
 * Break-even point is clearly marked.
 */
export function SavingsChart({ cashflows, years, paybackYear }: SavingsChartProps) {
  if (!cashflows || cashflows.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-800">Cumulatieve besparing over tijd</h3>
        <p className="mt-4 text-center text-sm text-gray-400">Geen cashflowdata beschikbaar</p>
      </div>
    );
  }

  const data: ChartDataPoint[] = [];
  let cumulativeSavings = 0;

  for (let y = 0; y <= years; y++) {
    cumulativeSavings += cashflows[y] ?? 0;
    data.push({
      year: y,
      label: `Jaar ${y}`,
      withBattery: Math.round(cumulativeSavings),
      withoutBattery: 0,
    });
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-800">
          Cumulatieve besparing over tijd
        </h3>
        <InfoTooltip text="Dit toont het cumulatieve financiële resultaat van de batterij-investering per jaar. Het break-even punt is waar de lijn de nul-as kruist." />
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12 }}
            label={{ value: 'Jaren', position: 'insideBottom', offset: -5, fontSize: 13 }}
          />
          <YAxis
            tickFormatter={(v: number) => formatEuro(v)}
            tick={{ fontSize: 11 }}
            label={{ value: 'Cumulatief (EUR)', angle: -90, position: 'insideLeft', offset: 0, fontSize: 13 }}
          />
          <Tooltip
            formatter={(value) => [formatEuro(Number(value ?? 0)), 'Cumulatief resultaat']}
            labelFormatter={(label) => String(label)}
          />
          <Legend />
          <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="4 4" label="Break-even" />
          {paybackYear != null && isFinite(paybackYear) && (
            <ReferenceLine
              x={`Jaar ${Math.ceil(paybackYear)}`}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              label={{ value: `Terugverdientijd: ${paybackYear.toFixed(1)} jr`, position: 'top', fontSize: 11 }}
            />
          )}
          <Line
            type="monotone"
            dataKey="withBattery"
            stroke="#059669"
            strokeWidth={2.5}
            name="Met batterij"
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="withoutBattery"
            stroke="#9ca3af"
            strokeWidth={1.5}
            strokeDasharray="5 5"
            name="Zonder batterij"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
