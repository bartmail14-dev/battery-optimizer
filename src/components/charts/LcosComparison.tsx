import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { formatNumber } from '../../utils/format';
import { InfoTooltip } from '../shared';

interface LcosComparisonProps {
  lcos: number;
  blendedGridPrice: number;
  peakRate: number;
  offPeakRate: number;
}

interface BarDataPoint {
  naam: string;
  waarde: number;
  kleur: string;
}

export function LcosComparison({
  lcos,
  blendedGridPrice,
  peakRate,
  offPeakRate,
}: LcosComparisonProps) {
  const data: BarDataPoint[] = [
    { naam: 'LCOS', waarde: lcos, kleur: '#f59e0b' },
    { naam: 'Gewogen netprijs', waarde: blendedGridPrice, kleur: '#6b7280' },
    { naam: 'Piektarief', waarde: peakRate, kleur: '#ef4444' },
    { naam: 'Daltarief', waarde: offPeakRate, kleur: '#22c55e' },
  ];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-800">
          LCOS vs. netprijzen
        </h3>
        <InfoTooltip text="Vergelijkt de Levelized Cost of Storage (LCOS) met de relevante netprijzen. Als de LCOS lager is dan het piektarief, is arbitrage winstgevend." />
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 10, right: 30, left: 100, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            type="number"
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) => `\u20AC${formatNumber(v, 2)}`}
            label={{
              value: 'EUR/kWh',
              position: 'insideBottom',
              offset: -5,
              fontSize: 13,
            }}
          />
          <YAxis
            type="category"
            dataKey="naam"
            tick={{ fontSize: 12 }}
            width={90}
          />
          <Tooltip
            formatter={(value: number | undefined, name: string | undefined) => [
              `\u20AC ${formatNumber(Number(value ?? 0), 4)}/kWh`,
              String(name),
            ]}
            labelFormatter={(label) => String(label)}
          />
          <Bar dataKey="waarde" name="Prijs" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.kleur} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <p className="mt-2 text-xs text-gray-400">
        Indicatief — LCOS omvat investeringskosten, onderhoud en degradatie over de volledige levensduur.
      </p>
    </div>
  );
}
