import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { CO2TimelineEntry } from '../../types';
import { formatNumber } from '../../utils/format';
import { InfoTooltip } from '../shared';

interface CO2CumulativeTimelineProps {
  co2Timeline: CO2TimelineEntry[];
}

function autoScale(kg: number): { value: number; unit: string } {
  if (Math.abs(kg) >= 1000) {
    return { value: kg / 1000, unit: 'ton' };
  }
  return { value: kg, unit: 'kg' };
}

export function CO2CumulativeTimeline({ co2Timeline }: CO2CumulativeTimelineProps) {
  if (!co2Timeline || co2Timeline.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-800">CO2-reductie over tijd</h3>
        <p className="mt-4 text-center text-sm text-gray-400">Geen CO2-data beschikbaar</p>
      </div>
    );
  }

  const maxCumulative = Math.max(...co2Timeline.map((e) => e.cumulativeReductionKg));
  const useTonnes = maxCumulative >= 1000;
  const divisor = useTonnes ? 1000 : 1;
  const yUnit = useTonnes ? 'ton CO2' : 'kg CO2';

  const data = co2Timeline.map((entry) => ({
    jaar: `Jaar ${entry.year}`,
    jaarlijks: entry.annualReductionKg / divisor,
    cumulatief: entry.cumulativeReductionKg / divisor,
  }));

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-800">
          CO2-reductie over tijd
        </h3>
        <InfoTooltip text="Toont de jaarlijkse en cumulatieve CO2-reductie door het batterijsysteem. De reductie is gebaseerd op het verschil in netafname met en zonder batterij, vermenigvuldigd met de emissiefactor van het Nederlandse elektriciteitsnet." />
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="jaar" tick={{ fontSize: 11 }} />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) => `${formatNumber(v, 1)}`}
            label={{ value: yUnit, angle: -90, position: 'insideLeft', offset: 0, fontSize: 13 }}
          />
          <Tooltip
            formatter={(value: number | undefined, name: string | undefined) => {
              const v = Number(value ?? 0);
              const n = String(name);
              const scaled = autoScale(v * divisor);
              if (n === 'jaarlijks') return [`${formatNumber(scaled.value, 1)} ${scaled.unit}`, 'Jaarlijks'];
              return [`${formatNumber(scaled.value, 1)} ${scaled.unit}`, 'Cumulatief'];
            }}
            labelFormatter={(label) => String(label)}
          />
          <Legend
            formatter={(value: string) =>
              value === 'jaarlijks' ? 'Jaarlijkse reductie' : 'Cumulatieve reductie'
            }
          />
          <Area
            type="monotone"
            dataKey="cumulatief"
            stroke="#22c55e"
            fill="#22c55e"
            fillOpacity={0.3}
            strokeWidth={2}
            name="cumulatief"
          />
          <Line
            type="monotone"
            dataKey="jaarlijks"
            stroke="#166534"
            strokeWidth={2.5}
            dot={{ r: 3 }}
            name="jaarlijks"
          />
        </ComposedChart>
      </ResponsiveContainer>

      <p className="mt-2 text-xs text-gray-400">
        Indicatief — CO2-reductie is geschat op basis van de gemiddelde emissiefactor van het Nederlandse elektriciteitsnet (ca. 0,4 kg CO2/kWh). Werkelijke reductie hangt af van de energiemix op het moment van laden/ontladen.
      </p>
    </div>
  );
}
