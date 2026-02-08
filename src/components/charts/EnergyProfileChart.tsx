import { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { formatNumber } from '../../utils/format';
import { InfoTooltip } from '../shared';
import { PEAK_HOURS } from '../../constants';

interface EnergyProfileChartProps {
  /** 8760 hourly consumption values in kWh */
  hourlyConsumption: number[];
  /** Optional: hourly battery charge/discharge from simulation */
  batteryCharge?: number[];
  batteryDischarge?: number[];
}

type DayType = 'weekday' | 'weekend';

function getTypicalDay(hourlyData: number[], dayType: DayType): number[] {
  const hourTotals = new Array(24).fill(0);
  const hourCounts = new Array(24).fill(0);

  for (let h = 0; h < hourlyData.length; h++) {
    const dayOfYear = Math.floor(h / 24);
    // Jan 1 2024 = Monday (day 0)
    const dayOfWeek = dayOfYear % 7;
    const isWeekend = dayOfWeek >= 5;
    const hourOfDay = h % 24;

    if ((dayType === 'weekend' && isWeekend) || (dayType === 'weekday' && !isWeekend)) {
      hourTotals[hourOfDay] += hourlyData[h] ?? 0;
      hourCounts[hourOfDay] += 1;
    }
  }

  return hourTotals.map((total, i) =>
    hourCounts[i] > 0 ? total / hourCounts[i] : 0
  );
}

/**
 * 24-hour energy profile chart showing typical day consumption
 * with battery charge/discharge zones and peak hour markers.
 */
export function EnergyProfileChart({
  hourlyConsumption,
  batteryCharge,
  batteryDischarge,
}: EnergyProfileChartProps) {
  const [dayType, setDayType] = useState<DayType>('weekday');

  if (!hourlyConsumption || hourlyConsumption.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-800">Verbruiksprofiel (typische dag)</h3>
        <p className="mt-4 text-center text-sm text-gray-400">Geen verbruiksdata beschikbaar</p>
      </div>
    );
  }

  const consumption = getTypicalDay(hourlyConsumption, dayType);
  const charge = batteryCharge ? getTypicalDay(batteryCharge, dayType) : null;
  const discharge = batteryDischarge ? getTypicalDay(batteryDischarge, dayType) : null;

  const data = consumption.map((kWh, hour) => ({
    hour: `${hour.toString().padStart(2, '0')}:00`,
    verbruik: Math.round(kWh * 100) / 100,
    laden: charge ? Math.round(charge[hour] * 100) / 100 : 0,
    ontladen: discharge ? Math.round(discharge[hour] * 100) / 100 : 0,
  }));

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-800">
            Verbruiksprofiel (typische dag)
          </h3>
          <InfoTooltip text="Gemiddeld uurlijks verbruik op een typische dag. De gearceerde zones tonen wanneer de batterij laadt (goedkoop) en ontlaadt (duur). Piekuren zijn gemarkeerd." />
        </div>

        <div className="flex rounded-lg border border-gray-200 text-sm">
          <button
            type="button"
            className={`px-3 py-1.5 rounded-l-lg transition ${
              dayType === 'weekday' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
            onClick={() => setDayType('weekday')}
          >
            Werkdag
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 rounded-r-lg transition ${
              dayType === 'weekend' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
            onClick={() => setDayType('weekend')}
          >
            Weekend
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="hour"
            tick={{ fontSize: 11 }}
            label={{ value: 'Uur van de dag', position: 'insideBottom', offset: -5, fontSize: 13 }}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            label={{ value: 'kWh', angle: -90, position: 'insideLeft', offset: 0, fontSize: 13 }}
          />
          <Tooltip
            formatter={(value, name) => [
              `${formatNumber(Number(value ?? 0), 2)} kWh`,
              name === 'verbruik' ? 'Verbruik' : name === 'laden' ? 'Batterij laden' : 'Batterij ontladen',
            ]}
          />
          <Legend
            formatter={(value: string) =>
              value === 'verbruik' ? 'Verbruik' : value === 'laden' ? 'Batterij laden' : 'Batterij ontladen'
            }
          />
          {/* Peak hours zone */}
          <ReferenceLine x={`${PEAK_HOURS.start.toString().padStart(2, '0')}:00`} stroke="#f59e0b" strokeDasharray="4 4" />
          <ReferenceLine x={`${PEAK_HOURS.end.toString().padStart(2, '0')}:00`} stroke="#f59e0b" strokeDasharray="4 4" />
          <Area
            type="monotone"
            dataKey="verbruik"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.15}
            strokeWidth={2}
          />
          {charge && (
            <Area
              type="monotone"
              dataKey="laden"
              stroke="#059669"
              fill="#059669"
              fillOpacity={0.3}
              strokeWidth={1.5}
            />
          )}
          {discharge && (
            <Area
              type="monotone"
              dataKey="ontladen"
              stroke="#ef4444"
              fill="#ef4444"
              fillOpacity={0.3}
              strokeWidth={1.5}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
