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
import { formatPercentage } from '../../utils/format';
import { InfoTooltip } from '../shared';
import { CAPITAL_COST_BENCHMARKS } from '../../constants';

interface CapitalCostComparisonProps {
  irr: number;
}

interface BarDataPoint {
  naam: string;
  waarde: number;
  kleur: string;
}

export function CapitalCostComparison({ irr }: CapitalCostComparisonProps) {
  const safeIrr = isFinite(irr) ? irr : 0;

  const data: BarDataPoint[] = [
    { naam: 'Staatsobligatie 10jr', waarde: CAPITAL_COST_BENCHMARKS.dutchGovernmentBond10yr, kleur: '#9ca3af' },
    { naam: 'Deposito', waarde: CAPITAL_COST_BENCHMARKS.bankDeposit, kleur: '#9ca3af' },
    { naam: 'WACC', waarde: CAPITAL_COST_BENCHMARKS.typicalWACC, kleur: '#9ca3af' },
    { naam: 'PE hurdle', waarde: CAPITAL_COST_BENCHMARKS.privateEquityHurdle, kleur: '#9ca3af' },
    { naam: 'Batterij IRR', waarde: safeIrr, kleur: '#3b82f6' },
  ];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-800">
          IRR vs. kapitaalkosten
        </h3>
        <InfoTooltip text="Vergelijkt het interne rendement (IRR) van de batterij-investering met gangbare rendementsreferenties. Hoe hoger de IRR ten opzichte van de benchmarks, hoe aantrekkelijker de investering." />
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 10, right: 30, left: 120, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            type="number"
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) => formatPercentage(v, 1)}
            domain={[0, 'auto']}
            label={{
              value: 'Rendement',
              position: 'insideBottom',
              offset: -5,
              fontSize: 13,
            }}
          />
          <YAxis
            type="category"
            dataKey="naam"
            tick={{ fontSize: 12 }}
            width={110}
          />
          <Tooltip
            formatter={(value: number | undefined, name: string | undefined) => [
              formatPercentage(Number(value ?? 0), 2),
              String(name),
            ]}
            labelFormatter={(label) => String(label)}
          />
          <Bar dataKey="waarde" name="Rendement" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.kleur} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <p className="mt-2 text-xs text-gray-400">
        Indicatief — benchmarkrendementen zijn marktgemiddelden en kunnen in de tijd variëren.
      </p>
    </div>
  );
}
