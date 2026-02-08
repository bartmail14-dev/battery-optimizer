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
import { formatEuro } from '../../utils/format';
import { InfoTooltip } from '../shared';

interface InvestmentWaterfallProps {
  grossInvestment: number;
  netInvestment: number;
  yearlyBreakdown: { grossSavings: number }[];
  peakShavingSavings: number;
  annualSubsidy: number;
  maintenanceCost: number;
  years: number;
}

interface WaterfallDataPoint {
  naam: string;
  waarde: number;
  kleur: string;
}

export function InvestmentWaterfall({
  grossInvestment,
  netInvestment,
  yearlyBreakdown,
  peakShavingSavings,
  annualSubsidy,
  maintenanceCost,
  years,
}: InvestmentWaterfallProps) {
  const totalArbitrage = yearlyBreakdown.reduce(
    (sum, yb) => sum + yb.grossSavings,
    0
  );

  const data: WaterfallDataPoint[] = [
    { naam: 'Bruto investering', waarde: -grossInvestment, kleur: '#ef4444' },
    { naam: 'EIA voordeel', waarde: grossInvestment - netInvestment, kleur: '#22c55e' },
    { naam: 'Netto investering', waarde: -netInvestment, kleur: '#6b7280' },
    { naam: `Arbitrage ${years}jr`, waarde: totalArbitrage, kleur: '#22c55e' },
    { naam: `Piekverlaging ${years}jr`, waarde: peakShavingSavings * years, kleur: '#3b82f6' },
    { naam: `SDE++ ${years}jr`, waarde: annualSubsidy * years, kleur: '#14b8a6' },
    { naam: `Onderhoud ${years}jr`, waarde: -maintenanceCost * years, kleur: '#ef4444' },
  ];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-800">
          Investeringswaterval
        </h3>
        <InfoTooltip text="Toont de opbouw van het financieel rendement: van bruto-investering naar netto-investering (na EIA) en de verwachte opbrengsten over de analyseperiode." />
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="naam" tick={{ fontSize: 10 }} />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) =>
              Math.abs(v) >= 1000
                ? `\u20AC${Math.round(v / 1000)}k`
                : `\u20AC${Math.round(v)}`
            }
            label={{
              value: 'EUR',
              angle: -90,
              position: 'insideLeft',
              offset: 0,
              fontSize: 13,
            }}
          />
          <Tooltip
            formatter={(value: number | undefined, name: string | undefined) => [
              formatEuro(Number(value ?? 0)),
              String(name),
            ]}
            labelFormatter={(label) => String(label)}
          />
          <Bar dataKey="waarde" name="Bedrag" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.kleur} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <p className="mt-2 text-xs text-gray-400">
        Nominale waarden, niet verdisconteerd. Zie de DCF-tabel voor tijdwaardecorrectie.
      </p>
    </div>
  );
}
