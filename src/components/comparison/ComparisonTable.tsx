import type { ComparisonResult } from '../../types';
import { formatEuro, formatYears, formatPercentage } from '../../utils/format';

interface ComparisonTableProps {
  results: ComparisonResult[];
}

export function ComparisonTable({ results }: ComparisonTableProps) {
  if (results.length === 0) return null;

  const metrics: Array<{ label: string; getValue: (r: ComparisonResult) => string }> = [
    { label: 'Capaciteit', getValue: (r) => `${r.config.capacityKwh} kWh` },
    { label: 'Vermogen', getValue: (r) => `${r.config.powerKw} kW` },
    { label: 'Investering', getValue: (r) => formatEuro(r.results.grossInvestment) },
    { label: 'Netto investering', getValue: (r) => formatEuro(r.results.netInvestment) },
    { label: 'NPV', getValue: (r) => formatEuro(r.results.npv) },
    { label: 'IRR', getValue: (r) => isFinite(r.results.irr) ? formatPercentage(r.results.irr) : '\u2014' },
    { label: 'Terugverdientijd', getValue: (r) => formatYears(r.results.simplePayback) },
    { label: 'Jaarlijkse besparing', getValue: (r) => formatEuro(r.results.annualSavings) },
    { label: 'LCOS', getValue: (r) => `${formatEuro(r.results.lcos, 2)}/kWh` },
    { label: 'CO\u2082-reductie', getValue: (r) => `${Math.round(r.results.co2ReductionKg).toLocaleString('nl-NL')} kg/jr` },
  ];

  // Find best NPV with positive return
  const bestIdx = results.reduce((best, r, idx) => {
    if (r.results.npv > 0 && (best === -1 || r.results.npv > results[best].results.npv)) {
      return idx;
    }
    return best;
  }, -1);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h3 className="mb-4 text-lg font-semibold text-gray-800">Vergelijkingstabel</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-300">
              <th className="py-2 text-left text-gray-600">Metriek</th>
              {results.map((r, i) => (
                <th key={r.configId} className="py-2 text-right text-gray-800">
                  {r.label}
                  {i === bestIdx && (
                    <span className="ml-2 inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      Beste ROI
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map((m) => (
              <tr key={m.label} className="border-b border-gray-100">
                <td className="py-2 text-gray-600">{m.label}</td>
                {results.map((r, i) => (
                  <td
                    key={r.configId}
                    className={`py-2 text-right font-mono ${i === bestIdx ? 'font-semibold text-green-700' : 'text-gray-900'}`}
                  >
                    {m.getValue(r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-gray-400">
        Disclaimer: Alle berekeningen zijn indicatief. Werkelijke resultaten kunnen afwijken.
      </p>
    </div>
  );
}
