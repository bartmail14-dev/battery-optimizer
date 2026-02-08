import type { YearlyBreakdown } from '../../types';
import { formatEuro, formatNumber } from '../../utils/format';
import { InfoTooltip } from '../shared';

interface DcfTableProps {
  yearlyBreakdown: YearlyBreakdown[];
}

export function DcfTable({ yearlyBreakdown }: DcfTableProps) {
  if (!yearlyBreakdown || yearlyBreakdown.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-800">DCF-tabel</h3>
        <p className="mt-4 text-center text-sm text-gray-400">Geen jaarlijkse data beschikbaar</p>
      </div>
    );
  }

  const totals = yearlyBreakdown.reduce(
    (acc, yb) => ({
      grossSavings: acc.grossSavings + yb.grossSavings,
      maintenance: acc.maintenance + yb.maintenance,
      subsidy: acc.subsidy + yb.subsidy,
      netCashflow: acc.netCashflow + yb.netCashflow,
      discountedCashflow: acc.discountedCashflow + (yb.discountedCashflow ?? 0),
    }),
    { grossSavings: 0, maintenance: 0, subsidy: 0, netCashflow: 0, discountedCashflow: 0 }
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-800">
          DCF-tabel
        </h3>
        <InfoTooltip text="Verdisconteerde cashflow-analyse per jaar. Toont de bruto besparing, onderhoud, subsidie, netto cashflow, disconteringsfactor en de verdisconteerde waarden." />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="py-2 text-left font-medium text-gray-500">Jaar</th>
              <th className="py-2 text-right font-medium text-gray-500">Bruto besparing</th>
              <th className="py-2 text-right font-medium text-gray-500">Onderhoud</th>
              <th className="py-2 text-right font-medium text-gray-500">Subsidie</th>
              <th className="py-2 text-right font-medium text-gray-500">Netto CF</th>
              <th className="py-2 text-right font-medium text-gray-500">Discount factor</th>
              <th className="py-2 text-right font-medium text-gray-500">Verdisconteerd</th>
              <th className="py-2 text-right font-medium text-gray-500">Cum. verdisconteerd</th>
            </tr>
          </thead>
          <tbody>
            {yearlyBreakdown.map((yb) => (
              <tr key={yb.year} className="border-b border-gray-100">
                <td className="py-1.5 text-gray-700">{yb.year}</td>
                <td className="py-1.5 text-right font-mono text-gray-800">
                  {formatEuro(yb.grossSavings)}
                </td>
                <td className="py-1.5 text-right font-mono text-red-600">
                  {formatEuro(-Math.abs(yb.maintenance))}
                </td>
                <td className="py-1.5 text-right font-mono text-teal-600">
                  {formatEuro(yb.subsidy)}
                </td>
                <td className="py-1.5 text-right font-mono text-gray-800">
                  {formatEuro(yb.netCashflow)}
                </td>
                <td className="py-1.5 text-right font-mono text-gray-600">
                  {formatNumber(yb.discountFactor ?? 1, 4)}
                </td>
                <td className="py-1.5 text-right font-mono text-gray-800">
                  {formatEuro(yb.discountedCashflow ?? 0)}
                </td>
                <td className="py-1.5 text-right font-mono text-gray-800">
                  {formatEuro(yb.cumulativeDiscountedCashflow ?? 0)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-300 font-semibold">
              <td className="py-2 text-gray-700">Totaal</td>
              <td className="py-2 text-right font-mono text-gray-800">
                {formatEuro(totals.grossSavings)}
              </td>
              <td className="py-2 text-right font-mono text-red-600">
                {formatEuro(-Math.abs(totals.maintenance))}
              </td>
              <td className="py-2 text-right font-mono text-teal-600">
                {formatEuro(totals.subsidy)}
              </td>
              <td className="py-2 text-right font-mono text-gray-800">
                {formatEuro(totals.netCashflow)}
              </td>
              <td className="py-2 text-right text-gray-400">-</td>
              <td className="py-2 text-right font-mono text-gray-800">
                {formatEuro(totals.discountedCashflow)}
              </td>
              <td className="py-2 text-right text-gray-400">-</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="mt-3 text-xs text-gray-400">
        Indicatief — verdiscontering op basis van de opgegeven discontovoet. Werkelijke kasstromen kunnen afwijken door marktomstandigheden.
      </p>
    </div>
  );
}
