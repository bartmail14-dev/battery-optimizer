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
import { useMemo } from 'react';
import type { HourlySimulationResult } from '../../types';
import { formatNumber } from '../../utils/format';
import { InfoTooltip } from '../shared';
import { HOURS_PER_MONTH, MONTH_NAMES } from '../../constants';

interface MonthlyPeakComparisonProps {
  hourlyResults: HourlySimulationResult[];
}

interface MonthlyPeakData {
  maand: string;
  piekZonder: number;
  piekMet: number;
}

export function MonthlyPeakComparison({ hourlyResults }: MonthlyPeakComparisonProps) {
  const data = useMemo<MonthlyPeakData[]>(() => {
    const result: MonthlyPeakData[] = [];
    let startHour = 0;

    for (let m = 0; m < 12; m++) {
      const endHour = startHour + HOURS_PER_MONTH[m];
      let maxConsumption = 0;
      let maxGridImport = 0;

      for (let h = startHour; h < endHour && h < hourlyResults.length; h++) {
        if (hourlyResults[h].consumption > maxConsumption) {
          maxConsumption = hourlyResults[h].consumption;
        }
        if (hourlyResults[h].gridImport > maxGridImport) {
          maxGridImport = hourlyResults[h].gridImport;
        }
      }

      result.push({
        maand: MONTH_NAMES[m].slice(0, 3),
        piekZonder: Math.round(maxConsumption * 100) / 100,
        piekMet: Math.round(maxGridImport * 100) / 100,
      });

      startHour = endHour;
    }

    return result;
  }, [hourlyResults]);

  if (!hourlyResults || hourlyResults.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-800">Maandelijkse piekvergelijking</h3>
        <p className="mt-4 text-center text-sm text-gray-400">Geen simulatiedata beschikbaar</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-800">Maandelijkse piekvergelijking</h3>
        <InfoTooltip text="Vergelijkt de maandelijkse piekvraag met en zonder batterij. Het verschil toont de effectieve piekverlaging per maand." />
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="maand" tick={{ fontSize: 11 }} />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) => `${formatNumber(v, 0)}`}
            label={{ value: 'kW', angle: -90, position: 'insideLeft', offset: 0, fontSize: 13 }}
          />
          <Tooltip
            formatter={(value: number | undefined, name: string | undefined) => [
              `${formatNumber(Number(value ?? 0), 1)} kW`,
              String(name) === 'piekZonder' ? 'Piek zonder batterij' : 'Piek met batterij',
            ]}
          />
          <Legend
            formatter={(value: string) =>
              value === 'piekZonder' ? 'Piek zonder batterij' : 'Piek met batterij'
            }
          />
          <Bar dataKey="piekZonder" fill="#94a3b8" name="piekZonder" radius={[4, 4, 0, 0]} />
          <Bar dataKey="piekMet" fill="#059669" name="piekMet" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
