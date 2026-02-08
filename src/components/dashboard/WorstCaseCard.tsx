import type { ScenarioResult } from '../../types';
import { formatEuro, formatNumber } from '../../utils/format';

interface WorstCaseCardProps {
  pessimisticScenario: ScenarioResult;
}

export function WorstCaseCard({ pessimisticScenario }: WorstCaseCardProps) {
  const isNegative = pessimisticScenario.npv < 0;

  return (
    <div
      className={`rounded-xl border-2 p-6 ${
        isNegative
          ? 'border-red-300 bg-red-50'
          : 'border-amber-300 bg-amber-50'
      }`}
    >
      <h4
        className={`text-sm font-bold uppercase tracking-wide ${
          isNegative ? 'text-red-700' : 'text-amber-700'
        }`}
      >
        In het slechtste geval...
      </h4>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <p className="text-xs text-gray-500">NPV (pessimistisch)</p>
          <p
            className={`text-lg font-semibold ${
              pessimisticScenario.npv >= 0 ? 'text-green-700' : 'text-red-700'
            }`}
          >
            {formatEuro(pessimisticScenario.npv)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Terugverdientijd</p>
          <p className="text-lg font-semibold text-gray-800">
            {isFinite(pessimisticScenario.simplePayback)
              ? `${formatNumber(pessimisticScenario.simplePayback, 1)} jaar`
              : '> 20 jaar'}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Jaarlijkse besparing</p>
          <p className="text-lg font-semibold text-gray-800">
            {formatEuro(pessimisticScenario.annualSavings)}
          </p>
        </div>
      </div>

      <p className="mt-3 text-xs opacity-50">
        Indicatief — pessimistisch scenario met ongunstige tarieven en hogere degradatie.
      </p>
    </div>
  );
}
