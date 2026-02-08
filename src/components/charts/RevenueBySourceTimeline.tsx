import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { YearlyRevenueBreakdown } from '../../types';
import { formatEuro } from '../../utils/format';
import { InfoTooltip } from '../shared';

interface RevenueBySourceTimelineProps {
  yearlyRevenueBreakdown: YearlyRevenueBreakdown[];
}

interface ChartDataPoint {
  jaar: string;
  arbitrage: number;
  piekverlaging: number;
  sde: number;
  onderhoud: number;
}

export function RevenueBySourceTimeline({ yearlyRevenueBreakdown }: RevenueBySourceTimelineProps) {
  if (!yearlyRevenueBreakdown || yearlyRevenueBreakdown.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-800">Opbrengsten per bron over tijd</h3>
        <p className="mt-4 text-center text-sm text-gray-400">Geen opbrengstdata beschikbaar</p>
      </div>
    );
  }

  const data: ChartDataPoint[] = yearlyRevenueBreakdown.map((entry) => ({
    jaar: `Jaar ${entry.year}`,
    arbitrage: Math.round(entry.arbitrageSavings),
    piekverlaging: Math.round(entry.peakShavingSavings),
    sde: Math.round(entry.sdeSubsidy),
    onderhoud: -Math.abs(Math.round(entry.maintenanceCost)),
  }));

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-800">
          Opbrengsten per bron over tijd
        </h3>
        <InfoTooltip text="Gestapeld vlakdiagram met de opbrengsten per inkomstenbron over de analyseperiode. Onderhoudskosten worden als negatief weergegeven. Zo ziet u hoe de inkomstensamenstelling verschuift door degradatie en subsidie-afloop." />
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="jaar" tick={{ fontSize: 11 }} />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) =>
              Math.abs(v) >= 1000 ? `\u20AC${Math.round(v / 1000)}k` : `\u20AC${Math.round(v)}`
            }
            label={{ value: 'EUR/jaar', angle: -90, position: 'insideLeft', offset: 0, fontSize: 13 }}
          />
          <Tooltip
            formatter={(value: number | undefined, name: string | undefined) => {
              const v = Number(value ?? 0);
              const n = String(name);
              const labels: Record<string, string> = {
                arbitrage: 'Arbitrage',
                piekverlaging: 'Piekverlaging',
                sde: 'SDE++',
                onderhoud: 'Onderhoud',
              };
              return [formatEuro(v), labels[n] ?? n];
            }}
            labelFormatter={(label) => String(label)}
          />
          <Legend
            formatter={(value: string) => {
              const labels: Record<string, string> = {
                arbitrage: 'Arbitrage',
                piekverlaging: 'Piekverlaging',
                sde: 'SDE++',
                onderhoud: 'Onderhoud',
              };
              return labels[value] ?? value;
            }}
          />
          <Area
            type="monotone"
            dataKey="arbitrage"
            stackId="rev"
            stroke="#22c55e"
            fill="#22c55e"
            fillOpacity={0.7}
            name="arbitrage"
          />
          <Area
            type="monotone"
            dataKey="piekverlaging"
            stackId="rev"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.7}
            name="piekverlaging"
          />
          <Area
            type="monotone"
            dataKey="sde"
            stackId="rev"
            stroke="#14b8a6"
            fill="#14b8a6"
            fillOpacity={0.7}
            name="sde"
          />
          <Area
            type="monotone"
            dataKey="onderhoud"
            stackId="rev"
            stroke="#ef4444"
            fill="#ef4444"
            fillOpacity={0.7}
            name="onderhoud"
          />
        </AreaChart>
      </ResponsiveContainer>

      <p className="mt-2 text-xs text-gray-400">
        Indicatief — gebaseerd op het basisscenario met verwachte degradatie en prijsgroei. Werkelijke opbrengsten kunnen afwijken.
      </p>
    </div>
  );
}
