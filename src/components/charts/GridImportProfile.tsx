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
import { useMemo } from 'react';
import type { HourlySimulationResult } from '../../types';
import { formatNumber } from '../../utils/format';
import { InfoTooltip } from '../shared';

interface GridImportProfileProps {
  hourlyResults: HourlySimulationResult[];
}

interface HourlyAverage {
  uur: string;
  zonderBatterij: number;
  metBatterij: number;
}

export function GridImportProfile({ hourlyResults }: GridImportProfileProps) {
  const data = useMemo<HourlyAverage[]>(() => {
    const sums = Array(24).fill(0);
    const gridSums = Array(24).fill(0);
    const counts = Array(24).fill(0);

    for (const h of hourlyResults) {
      const hod = h.hour % 24;
      sums[hod] += h.consumption;
      gridSums[hod] += h.gridImport;
      counts[hod] += 1;
    }

    return Array.from({ length: 24 }, (_, hr) => ({
      uur: `${hr}:00`,
      zonderBatterij: counts[hr] > 0 ? Math.round((sums[hr] / counts[hr]) * 100) / 100 : 0,
      metBatterij: counts[hr] > 0 ? Math.round((gridSums[hr] / counts[hr]) * 100) / 100 : 0,
    }));
  }, [hourlyResults]);

  if (!hourlyResults || hourlyResults.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-800">Netimport profiel</h3>
        <p className="mt-4 text-center text-sm text-gray-400">Geen simulatiedata beschikbaar</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-800">Netimport profiel (24-uurs)</h3>
        <InfoTooltip text="Vergelijkt het gemiddelde 24-uursprofiel van netimport met en zonder batterij. Het verschil is de bijdrage van de batterij aan piekverlaging." />
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="uur"
            tick={{ fontSize: 11 }}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) => `${formatNumber(v, 0)}`}
            label={{ value: 'kW', angle: -90, position: 'insideLeft', offset: 0, fontSize: 13 }}
          />
          <Tooltip
            formatter={(value: number | undefined, name: string | undefined) => [
              `${formatNumber(Number(value ?? 0), 2)} kW`,
              String(name) === 'zonderBatterij' ? 'Zonder batterij' : 'Met batterij',
            ]}
          />
          <Legend
            formatter={(value: string) =>
              value === 'zonderBatterij' ? 'Zonder batterij' : 'Met batterij'
            }
          />
          <Area
            type="monotone"
            dataKey="zonderBatterij"
            stroke="#94a3b8"
            fill="#94a3b8"
            fillOpacity={0.3}
            strokeWidth={2}
            name="zonderBatterij"
          />
          <Area
            type="monotone"
            dataKey="metBatterij"
            stroke="#059669"
            fill="#22c55e"
            fillOpacity={0.3}
            strokeWidth={2}
            name="metBatterij"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
