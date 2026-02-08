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

interface RevenueBreakdownChartProps {
  arbitrageSavings: number;
  peakShavingSavings: number;
  annualSubsidy: number;
  maintenanceCost: number;
}

interface BarDataPoint {
  naam: string;
  waarde: number;
  kleur: string;
}

export function RevenueBreakdownChart({
  arbitrageSavings,
  peakShavingSavings,
  annualSubsidy,
  maintenanceCost,
}: RevenueBreakdownChartProps) {
  const nettoTotaal = arbitrageSavings + peakShavingSavings + annualSubsidy - Math.abs(maintenanceCost);

  const data: BarDataPoint[] = [
    { naam: 'Arbitrage', waarde: Math.round(arbitrageSavings), kleur: '#22c55e' },
    { naam: 'Piekverlaging', waarde: Math.round(peakShavingSavings), kleur: '#3b82f6' },
    { naam: 'SDE++', waarde: Math.round(annualSubsidy), kleur: '#14b8a6' },
    { naam: 'Onderhoud', waarde: -Math.abs(Math.round(maintenanceCost)), kleur: '#ef4444' },
    { naam: 'Netto totaal', waarde: Math.round(nettoTotaal), kleur: '#059669' },
  ];

  const allZero = data.every((d) => d.waarde === 0);
  if (allZero) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-800">Opbouw jaarlijkse besparing</h3>
        <p className="mt-4 text-center text-sm text-gray-400">Geen besparingsdata beschikbaar</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-800">
          Opbouw jaarlijkse besparing
        </h3>
        <InfoTooltip text="Toont waar de jaarlijkse besparingen vandaan komen: energiearbitrage (goedkoop laden, duur ontladen), piekverlaging (lagere netkosten), SDE++ subsidie, minus onderhoudskosten." />
      </div>

      <p className="mb-2 text-xs text-gray-400">Indicatief op basis van het eerste operationele jaar. Werkelijke besparingen hangen af van marktprijzen en verbruikspatroon.</p>

      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="naam"
            tick={{ fontSize: 11 }}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) =>
              Math.abs(v) >= 1000 ? `\u20AC${Math.round(v / 1000)}k` : `\u20AC${Math.round(v)}`
            }
            label={{ value: 'EUR/jaar', angle: -90, position: 'insideLeft', offset: 0, fontSize: 13 }}
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
    </div>
  );
}
