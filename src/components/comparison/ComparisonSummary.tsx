import { Award, AlertTriangle } from 'lucide-react';
import type { ComparisonResult } from '../../types';
import { formatEuro, formatYears, formatPercentage } from '../../utils/format';

interface ComparisonSummaryProps {
  results: ComparisonResult[];
}

export function ComparisonSummary({ results }: ComparisonSummaryProps) {
  if (results.length === 0) return null;

  // Find best NPV with positive return
  const positiveResults = results.filter((r) => r.results.npv > 0);
  const best = positiveResults.length > 0
    ? positiveResults.reduce((a, b) => a.results.npv > b.results.npv ? a : b)
    : null;

  const allNegative = positiveResults.length === 0;

  return (
    <div className={`rounded-xl border p-6 ${
      allNegative
        ? 'border-amber-200 bg-amber-50'
        : 'border-green-200 bg-green-50'
    }`}>
      <div className="flex items-start gap-3">
        {allNegative ? (
          <AlertTriangle className="mt-0.5 h-6 w-6 text-amber-600" />
        ) : (
          <Award className="mt-0.5 h-6 w-6 text-green-600" />
        )}
        <div>
          <h3 className={`text-lg font-semibold ${allNegative ? 'text-amber-800' : 'text-green-800'}`}>
            {allNegative ? 'Geen positief rendement' : 'Aanbeveling'}
          </h3>
          {allNegative ? (
            <p className="mt-1 text-sm text-amber-700">
              Geen van de configuraties genereert een positief rendement (NPV) binnen de analyseperiode.
              Overweeg alternatieve configuraties of andere marktaannames.
            </p>
          ) : best && (
            <div className="mt-1">
              <p className="text-sm text-green-700">
                <span className="font-semibold">{best.label}</span> biedt het beste rendement
                met een NPV van {formatEuro(best.results.npv)}, een IRR van{' '}
                {isFinite(best.results.irr) ? formatPercentage(best.results.irr) : '\u2014'}
                {' '}en een terugverdientijd van {formatYears(best.results.simplePayback)}.
              </p>
              <div className="mt-3 grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xl font-bold text-green-700">{formatEuro(best.results.npv)}</p>
                  <p className="text-xs text-green-600">NPV</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-green-700">
                    {isFinite(best.results.irr) ? formatPercentage(best.results.irr) : '\u2014'}
                  </p>
                  <p className="text-xs text-green-600">IRR</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-green-700">{formatYears(best.results.simplePayback)}</p>
                  <p className="text-xs text-green-600">Terugverdientijd</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
