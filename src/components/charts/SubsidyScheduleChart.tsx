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
} from 'recharts';
import type { SubsidyScheduleEntry } from '../../types';
import { formatEuro } from '../../utils/format';
import { InfoTooltip } from '../shared';

interface SubsidyScheduleChartProps {
  subsidySchedule: SubsidyScheduleEntry[];
}

interface ChartDataPoint {
  jaar: string;
  sde: number;
  eia: number;
  cumulatief: number;
}

export function SubsidyScheduleChart({ subsidySchedule }: SubsidyScheduleChartProps) {
  if (!subsidySchedule || subsidySchedule.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-800">Subsidie-uitkering per jaar</h3>
        <p className="mt-4 text-center text-sm text-gray-400">Geen subsidiedata beschikbaar</p>
      </div>
    );
  }

  let cumulative = 0;
  const data: ChartDataPoint[] = subsidySchedule.map((entry) => {
    cumulative += entry.totalSubsidy;
    return {
      jaar: `Jaar ${entry.year}`,
      sde: Math.round(entry.sdeAmount),
      eia: Math.round(entry.eiaAmount),
      cumulatief: Math.round(cumulative),
    };
  });

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-800">
          Subsidie-uitkering per jaar
        </h3>
        <InfoTooltip text="Overzicht van subsidie-inkomsten per jaar: SDE++ loopt 15 jaar, EIA is een eenmalig fiscaal voordeel in jaar 0. De lijn toont het cumulatieve subsidiebedrag." />
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="jaar" tick={{ fontSize: 11 }} />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) =>
              Math.abs(v) >= 1000 ? `\u20AC${Math.round(v / 1000)}k` : `\u20AC${Math.round(v)}`
            }
            label={{ value: 'EUR', angle: -90, position: 'insideLeft', offset: 0, fontSize: 13 }}
          />
          <Tooltip
            formatter={(value: number | undefined, name: string | undefined) => {
              const v = Number(value ?? 0);
              const n = String(name);
              const labels: Record<string, string> = {
                sde: 'SDE++',
                eia: 'EIA',
                cumulatief: 'Cumulatief',
              };
              return [formatEuro(v), labels[n] ?? n];
            }}
            labelFormatter={(label) => String(label)}
          />
          <Legend
            formatter={(value: string) => {
              const labels: Record<string, string> = {
                sde: 'SDE++',
                eia: 'EIA',
                cumulatief: 'Cumulatief',
              };
              return labels[value] ?? value;
            }}
          />
          <ReferenceLine
            x="Jaar 15"
            stroke="#ef4444"
            strokeDasharray="6 3"
            label={{ value: 'SDE++ vervalt', position: 'top', fontSize: 11, fill: '#ef4444' }}
          />
          <Bar dataKey="sde" stackId="sub" fill="#14b8a6" name="sde" radius={[0, 0, 0, 0]} />
          <Bar dataKey="eia" stackId="sub" fill="#22c55e" name="eia" radius={[4, 4, 0, 0]} />
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
        Indicatief — subsidiebedragen zijn afhankelijk van daadwerkelijke toekenning en jaarlijkse correctiebedragen.
      </p>
    </div>
  );
}
