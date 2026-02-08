import type { CalculationResult, FinancialParams } from '../../types';
import { formatEuro, formatPercentage, formatNumber } from '../../utils/format';
import { METRIC_THRESHOLDS } from '../../constants';

interface GoNoGoVerdictProps {
  results: CalculationResult;
  financials: FinancialParams;
}

type Verdict = 'positief' | 'aandachtspunten' | 'negatief';

function getVerdict(results: CalculationResult, financials: FinancialParams): Verdict {
  const wacc = financials.discountRate;
  if (results.npv < 0) return 'negatief';
  if (results.simplePayback > METRIC_THRESHOLDS.payback.maxAcceptable || results.irr < wacc) return 'aandachtspunten';
  return 'positief';
}

const VERDICT_STYLES: Record<Verdict, { bg: string; border: string; text: string; label: string }> = {
  positief: {
    bg: 'bg-green-50',
    border: 'border-green-400',
    text: 'text-green-800',
    label: 'POSITIEF ADVIES',
  },
  aandachtspunten: {
    bg: 'bg-amber-50',
    border: 'border-amber-400',
    text: 'text-amber-800',
    label: 'AANDACHTSPUNTEN',
  },
  negatief: {
    bg: 'bg-red-50',
    border: 'border-red-400',
    text: 'text-red-800',
    label: 'NEGATIEF ADVIES',
  },
};

export function GoNoGoVerdict({ results, financials }: GoNoGoVerdictProps) {
  const verdict = getVerdict(results, financials);
  const style = VERDICT_STYLES[verdict];
  const wacc = financials.discountRate;

  const thesis = `De investering van ${formatEuro(results.grossInvestment)} verdient zichzelf in ${formatNumber(results.simplePayback, 1)} jaar terug bij een rendement van ${formatPercentage(results.irr)}, ${results.irr > wacc ? 'ruim boven' : 'onder'} de kapitaalkosten.`;

  return (
    <div className={`rounded-xl border-2 ${style.border} ${style.bg} p-6`}>
      <div className="flex items-center gap-3">
        <span className={`text-lg font-bold uppercase tracking-wide ${style.text}`}>
          {style.label}
        </span>
      </div>
      <p className={`mt-3 text-sm leading-relaxed ${style.text}`}>
        {thesis}
      </p>

      <p className="mt-2 text-xs text-gray-400">
        Indicatief advies op basis van het basisscenario. Raadpleeg het volledige rapport voor risico-analyse en scenario&apos;s.
      </p>
    </div>
  );
}
