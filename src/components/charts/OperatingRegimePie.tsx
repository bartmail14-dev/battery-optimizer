import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatEuro } from '../../utils/format';
import type { OperatingRegimeBreakdown } from '../../types';
import { MetricCard } from '../shared';
import { InfoTooltip } from '../shared';

interface OperatingRegimePieProps {
  operatingRegime: OperatingRegimeBreakdown;
}

const COLORS: Record<string, string> = {
  arbitrage_charge: '#3b82f6',
  arbitrage_discharge: '#22c55e',
  peak_shaving: '#14b8a6',
  idle: '#6b7280',
};

const LABELS: Record<string, string> = {
  arbitrage_charge: 'Arbitrage laden',
  arbitrage_discharge: 'Arbitrage ontladen',
  peak_shaving: 'Piekverlaging',
  idle: 'Inactief',
};

interface PieDataPoint {
  naam: string;
  uren: number;
  kleur: string;
}

export function OperatingRegimePie({ operatingRegime }: OperatingRegimePieProps) {
  const regimeKeys = ['arbitrage_charge', 'arbitrage_discharge', 'peak_shaving', 'idle'] as const;

  const data: PieDataPoint[] = regimeKeys.map((key) => ({
    naam: LABELS[key],
    uren: operatingRegime.hours[key] ?? 0,
    kleur: COLORS[key],
  }));

  const totalHours = data.reduce((sum, d) => sum + d.uren, 0);

  if (totalHours === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-800">Operationeel regime</h3>
        <p className="mt-4 text-center text-sm text-gray-400">Geen regimedata beschikbaar</p>
      </div>
    );
  }

  const renderLabel = (props: { value?: number }) => {
    const uren = Number(props.value ?? 0);
    const pct = totalHours > 0 ? (uren / totalHours) * 100 : 0;
    if (pct < 3) return '';
    return `${Math.round(pct)}%`;
  };

  const arbitrageRevenue =
    (operatingRegime.revenue.arbitrage_charge ?? 0) +
    (operatingRegime.revenue.arbitrage_discharge ?? 0);
  const peakShavingRevenue = operatingRegime.revenue.peak_shaving ?? 0;

  const arbitrageHours =
    (operatingRegime.hours.arbitrage_charge ?? 0) +
    (operatingRegime.hours.arbitrage_discharge ?? 0);
  const peakShavingHours = operatingRegime.hours.peak_shaving ?? 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-800">
          Operationeel regime
        </h3>
        <InfoTooltip text="Verdeling van de batterijuren over de verschillende bedrijfsmodi: arbitrage laden/ontladen (kopen/verkopen op prijsverschillen), piekverlaging (verlagen van netbelasting) en inactieve uren." />
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <PieChart>
          <Pie
            data={data}
            dataKey="uren"
            nameKey="naam"
            cx="50%"
            cy="50%"
            outerRadius={130}
            label={renderLabel}
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.kleur} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number | undefined, name: string | undefined) => {
              const v = Number(value ?? 0);
              const n = String(name);
              const pct = totalHours > 0 ? (v / totalHours) * 100 : 0;
              return [`${v.toLocaleString('nl-NL')} uur (${Math.round(pct)}%)`, n];
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MetricCard
          label="Omzet arbitrage"
          value={formatEuro(arbitrageRevenue)}
          unit="/jaar"
          status="positive"
          explanation={`${arbitrageHours} uur laden+ontladen`}
        />
        <MetricCard
          label="Omzet piekverlaging"
          value={formatEuro(peakShavingRevenue)}
          unit="/jaar"
          status="positive"
          explanation={`${peakShavingHours} uur piekverlaging actief`}
        />
      </div>

      <p className="mt-2 text-xs text-gray-400">
        Indicatief — verdeling op basis van de jaarsimulatie. Werkelijk regime hangt af van marktprijzen en verbruikspatroon.
      </p>
    </div>
  );
}
