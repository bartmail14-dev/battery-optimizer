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
import type { HourlySimulationResult } from '../../types';
import { formatNumber } from '../../utils/format';
import { InfoTooltip } from '../shared';

interface StateOfChargeChartProps {
  hourlyResults: HourlySimulationResult[];
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];

/** Hours per month (non-leap year) */
const HOURS_PER_MONTH = [744, 672, 744, 720, 744, 720, 744, 744, 720, 744, 720, 744];

interface DailyAggregation {
  dag: number;
  maand: string;
  gemiddelde: number;
  min: number;
  max: number;
}

function aggregateToDailyBands(hourlyResults: HourlySimulationResult[]): DailyAggregation[] {
  const days: DailyAggregation[] = [];
  const hoursPerDay = 24;
  const totalDays = Math.floor(hourlyResults.length / hoursPerDay);

  // Pre-compute month boundaries in hours
  const monthBoundaries: number[] = [];
  let cumHours = 0;
  for (const h of HOURS_PER_MONTH) {
    cumHours += h;
    monthBoundaries.push(cumHours);
  }

  for (let d = 0; d < totalDays; d++) {
    const startHour = d * hoursPerDay;
    const endHour = startHour + hoursPerDay;

    let sum = 0;
    let min = 100;
    let max = 0;

    for (let h = startHour; h < endHour && h < hourlyResults.length; h++) {
      const soc = hourlyResults[h].stateOfCharge * 100;
      sum += soc;
      if (soc < min) min = soc;
      if (soc > max) max = soc;
    }

    const avg = sum / hoursPerDay;

    // Determine month index from hour boundary
    let monthIdx = 0;
    for (let m = 0; m < monthBoundaries.length; m++) {
      if (startHour < monthBoundaries[m]) {
        monthIdx = m;
        break;
      }
    }

    days.push({
      dag: d + 1,
      maand: MONTH_LABELS[monthIdx],
      gemiddelde: Math.round(avg * 10) / 10,
      min: Math.round(min * 10) / 10,
      max: Math.round(max * 10) / 10,
    });
  }

  return days;
}

export function StateOfChargeChart({ hourlyResults }: StateOfChargeChartProps) {
  if (!hourlyResults || hourlyResults.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-800">Laadtoestand (SoC) over het jaar</h3>
        <p className="mt-4 text-center text-sm text-gray-400">Geen simulatiedata beschikbaar</p>
      </div>
    );
  }

  const data = aggregateToDailyBands(hourlyResults);

  // Show month labels on x-axis at roughly the 15th of each month
  const monthTicks: number[] = [];
  let cumDays = 0;
  const daysPerMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  for (const d of daysPerMonth) {
    monthTicks.push(cumDays + Math.floor(d / 2));
    cumDays += d;
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-800">
          Laadtoestand (SoC) over het jaar
        </h3>
        <InfoTooltip text="Toont de dagelijkse laadtoestand van de batterij gedurende het jaar. De band geeft de spreiding tussen minimum en maximum SoC per dag weer." />
      </div>

      <p className="mb-2 text-xs text-gray-400">Op basis van gesimuleerd batterijgedrag met synthetisch of ge\u00FCpload verbruiksprofiel.</p>

      <ResponsiveContainer width="100%" height={350}>
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="dag"
            ticks={monthTicks}
            tickFormatter={(dag: number) => {
              const idx = monthTicks.indexOf(dag);
              return idx >= 0 ? MONTH_LABELS[idx] : '';
            }}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) => `${v}%`}
            label={{ value: 'SoC (%)', angle: -90, position: 'insideLeft', offset: 0, fontSize: 13 }}
          />
          <Tooltip
            formatter={(value: number | undefined, name: string | undefined) => [
              `${formatNumber(Number(value ?? 0), 1)}%`,
              String(name) === 'max' ? 'Maximum' : String(name) === 'min' ? 'Minimum' : 'Gemiddeld',
            ]}
            labelFormatter={(label) => `Dag ${label}`}
          />
          <Legend
            formatter={(value: string) =>
              value === 'max' ? 'Maximum' : value === 'min' ? 'Minimum' : 'Gemiddeld'
            }
          />
          <Area
            type="monotone"
            dataKey="max"
            stroke="#93c5fd"
            fill="#93c5fd"
            fillOpacity={0.3}
            strokeWidth={1}
          />
          <Area
            type="monotone"
            dataKey="gemiddelde"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.4}
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="min"
            stroke="#93c5fd"
            fill="#ffffff"
            fillOpacity={1}
            strokeWidth={1}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
