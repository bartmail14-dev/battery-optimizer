import type { MonthlyBreakdown } from '../../types';
import { InfoTooltip } from '../shared';
import { formatEuro, formatNumber, formatPercentage } from '../../utils/format';

interface MonthlySavingsTableProps {
  monthlyBreakdown: MonthlyBreakdown[];
}

export function MonthlySavingsTable({ monthlyBreakdown }: MonthlySavingsTableProps) {
  if (!monthlyBreakdown || monthlyBreakdown.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-800">Maandelijks overzicht</h3>
        <p className="mt-4 text-center text-sm text-gray-400">Geen maanddata beschikbaar</p>
      </div>
    );
  }

  const totals = monthlyBreakdown.reduce(
    (acc, m) => ({
      costWithout: acc.costWithout + m.costWithout,
      costWith: acc.costWith + m.costWith,
      savings: acc.savings + m.savings,
      energyCharged: acc.energyCharged + m.energyCharged,
      energyDischarged: acc.energyDischarged + m.energyDischarged,
      cycles: acc.cycles + m.cycles,
    }),
    { costWithout: 0, costWith: 0, savings: 0, energyCharged: 0, energyDischarged: 0, cycles: 0 }
  );

  const totalEfficiency = totals.energyCharged > 0
    ? totals.energyDischarged / totals.energyCharged
    : 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-800">Maandelijks overzicht</h3>
        <InfoTooltip text="Gedetailleerd maandelijks overzicht van kosten, besparingen en batterijprestaties over het eerste jaar." />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <th className="px-2 py-2">Maand</th>
              <th className="px-2 py-2 text-right">Kosten zonder</th>
              <th className="px-2 py-2 text-right">Kosten met</th>
              <th className="px-2 py-2 text-right">Besparing</th>
              <th className="px-2 py-2 text-right">Besp. %</th>
              <th className="px-2 py-2 text-right">Geladen</th>
              <th className="px-2 py-2 text-right">Ontladen</th>
              <th className="px-2 py-2 text-right">Cycli</th>
              <th className="px-2 py-2 text-right">Rend. %</th>
            </tr>
          </thead>
          <tbody>
            {monthlyBreakdown.map((m) => {
              const savingsPct = m.costWithout > 0 ? m.savings / m.costWithout : 0;
              const efficiency = m.energyCharged > 0 ? m.energyDischarged / m.energyCharged : 0;

              return (
                <tr key={m.month} className="border-b border-gray-100">
                  <td className="px-2 py-2 font-medium">{m.label}</td>
                  <td className="px-2 py-2 text-right">{formatEuro(m.costWithout)}</td>
                  <td className="px-2 py-2 text-right">{formatEuro(m.costWith)}</td>
                  <td className="px-2 py-2 text-right text-green-700 font-medium">{formatEuro(m.savings)}</td>
                  <td className="px-2 py-2 text-right">{formatPercentage(savingsPct)}</td>
                  <td className="px-2 py-2 text-right">{formatNumber(m.energyCharged, 0)} kWh</td>
                  <td className="px-2 py-2 text-right">{formatNumber(m.energyDischarged, 0)} kWh</td>
                  <td className="px-2 py-2 text-right">{formatNumber(m.cycles, 1)}</td>
                  <td className="px-2 py-2 text-right">{formatPercentage(efficiency)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-300 font-bold">
              <td className="px-2 py-2">Totaal</td>
              <td className="px-2 py-2 text-right">{formatEuro(totals.costWithout)}</td>
              <td className="px-2 py-2 text-right">{formatEuro(totals.costWith)}</td>
              <td className="px-2 py-2 text-right text-green-700">{formatEuro(totals.savings)}</td>
              <td className="px-2 py-2 text-right">
                {formatPercentage(totals.costWithout > 0 ? totals.savings / totals.costWithout : 0)}
              </td>
              <td className="px-2 py-2 text-right">{formatNumber(totals.energyCharged, 0)} kWh</td>
              <td className="px-2 py-2 text-right">{formatNumber(totals.energyDischarged, 0)} kWh</td>
              <td className="px-2 py-2 text-right">{formatNumber(totals.cycles, 1)}</td>
              <td className="px-2 py-2 text-right">{formatPercentage(totalEfficiency)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
