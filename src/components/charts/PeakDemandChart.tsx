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
import type { HourlySimulationResult } from '../../types';
import { formatNumber } from '../../utils/format';
import { InfoTooltip } from '../shared';

interface PeakDemandChartProps {
  hourlyResults: HourlySimulationResult[];
  peakReductionKw: number;
}

interface DurationCurvePoint {
  percentiel: number;
  zonderBatterij: number;
  metBatterij: number;
}

function buildDurationCurve(hourlyResults: HourlySimulationResult[]): DurationCurvePoint[] {
  const consumption = hourlyResults.map((h) => h.consumption);
  const gridImport = hourlyResults.map((h) => h.gridImport);

  // Sort descending
  const sortedConsumption = [...consumption].sort((a, b) => b - a);
  const sortedGridImport = [...gridImport].sort((a, b) => b - a);

  // Downsample to ~200 points for performance
  const step = Math.max(1, Math.floor(sortedConsumption.length / 200));
  const points: DurationCurvePoint[] = [];

  for (let i = 0; i < sortedConsumption.length; i += step) {
    points.push({
      percentiel: Math.round((i / sortedConsumption.length) * 1000) / 10,
      zonderBatterij: Math.round(sortedConsumption[i] * 100) / 100,
      metBatterij: Math.round(sortedGridImport[i] * 100) / 100,
    });
  }

  // Always include the last point
  const lastIdx = sortedConsumption.length - 1;
  if (points[points.length - 1].percentiel !== 100) {
    points.push({
      percentiel: 100,
      zonderBatterij: Math.round(sortedConsumption[lastIdx] * 100) / 100,
      metBatterij: Math.round(sortedGridImport[lastIdx] * 100) / 100,
    });
  }

  return points;
}

export function PeakDemandChart({ hourlyResults, peakReductionKw }: PeakDemandChartProps) {
  if (!hourlyResults || hourlyResults.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-800">Piekverlaging (Duration Curve)</h3>
        <p className="mt-4 text-center text-sm text-gray-400">Geen simulatiedata beschikbaar</p>
      </div>
    );
  }

  const data = buildDurationCurve(hourlyResults);

  const peakWithout = data.length > 0 ? data[0].zonderBatterij : 0;
  const peakWith = data.length > 0 ? data[0].metBatterij : 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-800">
          Piekverlaging (Duration Curve)
        </h3>
        <InfoTooltip text="De duration curve sorteert alle uren van het jaar op verbruik (hoogst naar laagst). Het verschil tussen de twee lijnen aan de linkerkant toont de piekverlaging door de batterij." />
      </div>

      <div className="mb-3 flex flex-wrap gap-4 text-sm text-gray-600">
        <span>Piek zonder batterij: <strong className="text-gray-900">{formatNumber(peakWithout, 1)} kW</strong></span>
        <span>Piek met batterij: <strong className="text-green-700">{formatNumber(peakWith, 1)} kW</strong></span>
        <span>Reductie: <strong className="text-blue-700">{formatNumber(peakReductionKw, 1)} kW</strong></span>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="percentiel"
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) => `${v}%`}
            label={{ value: 'Percentiel uren', position: 'insideBottom', offset: -5, fontSize: 13 }}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) => `${formatNumber(v, 0)}`}
            label={{ value: 'kW', angle: -90, position: 'insideLeft', offset: 0, fontSize: 13 }}
          />
          <Tooltip
            formatter={(value: number | undefined, name: string | undefined) => [
              `${formatNumber(Number(value ?? 0), 1)} kW`,
              String(name) === 'zonderBatterij' ? 'Zonder batterij' : 'Met batterij',
            ]}
            labelFormatter={(label) => `Percentiel: ${label}%`}
          />
          <Legend
            formatter={(value: string) =>
              value === 'zonderBatterij' ? 'Zonder batterij' : 'Met batterij'
            }
          />
          <ReferenceLine
            y={peakWith}
            stroke="#059669"
            strokeDasharray="4 4"
            label={{ value: `Nieuwe piek: ${formatNumber(peakWith, 1)} kW`, position: 'right', fontSize: 10 }}
          />
          <Line
            type="monotone"
            dataKey="zonderBatterij"
            stroke="#94a3b8"
            strokeWidth={2}
            dot={false}
            name="zonderBatterij"
          />
          <Line
            type="monotone"
            dataKey="metBatterij"
            stroke="#059669"
            strokeWidth={2}
            dot={false}
            name="metBatterij"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
