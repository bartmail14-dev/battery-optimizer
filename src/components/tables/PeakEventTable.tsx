import { useMemo } from 'react';
import type { HourlySimulationResult } from '../../types';
import { InfoTooltip } from '../shared';
import { formatNumber } from '../../utils/format';

interface PeakEventTableProps {
  hourlyResults: HourlySimulationResult[];
}

interface PeakEvent {
  hour: number;
  datum: string;
  consumption: number;
  batteryDischarge: number;
  gridImport: number;
  reduction: number;
}

const DAYS_PER_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MONTH_SHORT = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

function hourToDateString(hourIndex: number): string {
  const day = Math.floor(hourIndex / 24);
  const hourOfDay = hourIndex % 24;

  let remaining = day;
  for (let m = 0; m < 12; m++) {
    if (remaining < DAYS_PER_MONTH[m]) {
      return `${remaining + 1} ${MONTH_SHORT[m]} ${String(hourOfDay).padStart(2, '0')}:00`;
    }
    remaining -= DAYS_PER_MONTH[m];
  }
  return `dag ${day + 1} ${String(hourOfDay).padStart(2, '0')}:00`;
}

export function PeakEventTable({ hourlyResults }: PeakEventTableProps) {
  const events = useMemo<PeakEvent[]>(() => {
    const sorted = [...hourlyResults].sort((a, b) => b.consumption - a.consumption);
    return sorted.slice(0, 20).map((h) => ({
      hour: h.hour,
      datum: hourToDateString(h.hour),
      consumption: h.consumption,
      batteryDischarge: h.batteryDischarge,
      gridImport: h.gridImport,
      reduction: h.consumption - h.gridImport,
    }));
  }, [hourlyResults]);

  if (!hourlyResults || hourlyResults.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-800">Top 20 piekgebeurtenissen</h3>
        <p className="mt-4 text-center text-sm text-gray-400">Geen simulatiedata beschikbaar</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-800">Top 20 piekgebeurtenissen</h3>
        <InfoTooltip text="De 20 uren met het hoogste verbruik. Toont hoe de batterij bijdraagt aan piekverlaging op de momenten die er het meest toe doen." />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Datum/uur</th>
              <th className="px-3 py-2 text-right">Verbruik (kW)</th>
              <th className="px-3 py-2 text-right">Batterij (kW)</th>
              <th className="px-3 py-2 text-right">Netimport (kW)</th>
              <th className="px-3 py-2 text-right">Reductie (kW)</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e, i) => (
              <tr
                key={e.hour}
                className={`border-b border-gray-100 ${e.batteryDischarge > 0 ? 'bg-green-50' : ''}`}
              >
                <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                <td className="px-3 py-2 font-mono text-xs">{e.datum}</td>
                <td className="px-3 py-2 text-right">{formatNumber(e.consumption, 1)}</td>
                <td className="px-3 py-2 text-right text-green-700 font-medium">
                  {e.batteryDischarge > 0 ? formatNumber(e.batteryDischarge, 1) : '—'}
                </td>
                <td className="px-3 py-2 text-right">{formatNumber(e.gridImport, 1)}</td>
                <td className="px-3 py-2 text-right font-medium">
                  {e.reduction > 0 ? formatNumber(e.reduction, 1) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
