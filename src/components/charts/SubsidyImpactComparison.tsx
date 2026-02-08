import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatEuro, formatNumber } from '../../utils/format';
import { InfoTooltip } from '../shared';

interface SubsidyImpactComparisonProps {
  npv: number;
  noSubsidyNpv: number;
  simplePayback: number;
  noSubsidyPayback: number;
  irr: number;
  noSubsidyIrr: number;
  subsidyImpactEur: number;
}

interface ChartDataPoint {
  naam: string;
  metSubsidie: number;
  zonderSubsidie: number;
}

export function SubsidyImpactComparison({
  npv,
  noSubsidyNpv,
  simplePayback,
  noSubsidyPayback,
  irr,
  noSubsidyIrr,
  subsidyImpactEur,
}: SubsidyImpactComparisonProps) {
  if (subsidyImpactEur === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-800">Impact subsidie op rendement</h3>
        <p className="mt-4 text-center text-sm text-gray-400">Geen subsidie geconfigureerd — business case is volledig op eigen kracht.</p>
      </div>
    );
  }

  const data: ChartDataPoint[] = [
    { naam: 'NPV (EUR)', metSubsidie: Math.round(npv), zonderSubsidie: Math.round(noSubsidyNpv) },
    { naam: 'Terugverdientijd (jr)', metSubsidie: Math.round(simplePayback * 10) / 10, zonderSubsidie: Math.round(noSubsidyPayback * 10) / 10 },
    { naam: 'IRR (%)', metSubsidie: Math.round(irr * 1000) / 10, zonderSubsidie: Math.round(noSubsidyIrr * 1000) / 10 },
  ];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-800">
          Impact subsidie op rendement
        </h3>
        <InfoTooltip text="Vergelijkt de belangrijkste financiele kengetallen met en zonder subsidie (SDE++ en EIA). Zo ziet u hoeveel de subsidie bijdraagt aan het rendement van uw investering." />
      </div>

      <div className="mb-4 rounded-lg bg-teal-50 border border-teal-200 px-4 py-3 text-center">
        <p className="text-sm text-teal-700">Totale subsidie-impact op NPV</p>
        <p className="text-2xl font-bold text-teal-800">{formatEuro(subsidyImpactEur)}</p>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="naam" tick={{ fontSize: 11 }} />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) =>
              Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : `${Math.round(v)}`
            }
          />
          <Tooltip
            formatter={(value: number | undefined, name: string | undefined) => {
              const v = Number(value ?? 0);
              const n = String(name);
              return [formatNumber(v, 1), n === 'metSubsidie' ? 'Met subsidie' : 'Zonder subsidie'];
            }}
            labelFormatter={(label) => String(label)}
          />
          <Legend
            formatter={(value: string) =>
              value === 'metSubsidie' ? 'Met subsidie' : 'Zonder subsidie'
            }
          />
          <Bar dataKey="metSubsidie" fill="#14b8a6" name="metSubsidie" radius={[4, 4, 0, 0]} />
          <Bar dataKey="zonderSubsidie" fill="#6b7280" name="zonderSubsidie" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <p className="mt-2 text-xs text-gray-400">
        Indicatief — subsidie-impact is gebaseerd op het basisscenario. Werkelijke subsidiebedragen hangen af van toekenning en regelgeving.
      </p>
    </div>
  );
}
