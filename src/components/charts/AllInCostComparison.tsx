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
import { InfoTooltip } from '../shared';
import { formatNumber } from '../../utils/format';

interface AllInCostComparisonProps {
  blendedGridPrice: number;
  totalCostWithBattery: number;
  annualConsumptionKwh: number;
  lcos: number;
}

interface CostBarData {
  label: string;
  kosten: number;
  color: string;
}

export function AllInCostComparison({
  blendedGridPrice,
  totalCostWithBattery,
  annualConsumptionKwh,
  lcos,
}: AllInCostComparisonProps) {
  const netPlusBattery = annualConsumptionKwh > 0
    ? totalCostWithBattery / annualConsumptionKwh
    : 0;

  const data: CostBarData[] = [
    { label: 'Alleen net', kosten: Math.round(blendedGridPrice * 10000) / 10000, color: '#94a3b8' },
    { label: 'Net + batterij', kosten: Math.round(netPlusBattery * 10000) / 10000, color: '#059669' },
    { label: 'LCOS batterij', kosten: Math.round(lcos * 10000) / 10000, color: '#3b82f6' },
  ];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-800">Energiekostenvergelijking</h3>
        <InfoTooltip text="Vergelijkt de energiekosten per kWh: alleen net, net inclusief batterijopslag, en de LCOS (levelized cost of storage) van de batterij zelf. Exclusief onderhoudskosten — zie de DCF-tabel voor het volledige kostenplaatje." />
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical" margin={{ top: 10, right: 60, left: 100, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) => `${formatNumber(v * 100, 1)} ct`}
            label={{ value: 'EUR/kWh', position: 'insideBottom', offset: -5, fontSize: 12 }}
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fontSize: 12 }}
            width={95}
          />
          <Tooltip
            formatter={(value: number | undefined) => [
              `${formatNumber(Number(value ?? 0) * 100, 2)} ct/kWh`,
              'Kosten',
            ]}
          />
          <Bar dataKey="kosten" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <p className="mt-2 text-xs text-gray-400">
        Indicatief — gebaseerd op jaargemiddelden. LCOS omvat investeringskosten en degradatie. Exclusief onderhoudskosten.
      </p>
    </div>
  );
}
