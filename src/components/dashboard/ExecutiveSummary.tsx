import type { CalculationResult } from '../../types';
import { MetricCard } from '../shared';
import type { MetricStatus } from '../shared';
import { formatEuro, formatPercentage, formatNumber } from '../../utils/format';
import { METRIC_THRESHOLDS } from '../../constants';

interface ExecutiveSummaryProps {
  results: CalculationResult;
  onDetailClick?: (metric: string) => void;
}

function getPaybackStatus(years: number): MetricStatus {
  if (!isFinite(years)) return 'negative';
  if (years <= METRIC_THRESHOLDS.payback.positive) return 'positive';
  if (years <= METRIC_THRESHOLDS.payback.neutral) return 'neutral';
  return 'negative';
}

function getNpvStatus(npv: number): MetricStatus {
  if (npv > METRIC_THRESHOLDS.npv.positive) return 'positive';
  if (npv >= METRIC_THRESHOLDS.npv.neutral) return 'neutral';
  return 'negative';
}

function getRoiStatus(irr: number): MetricStatus {
  if (!isFinite(irr)) return 'negative';
  if (irr > METRIC_THRESHOLDS.irr.positive) return 'positive';
  if (irr >= METRIC_THRESHOLDS.irr.neutral) return 'neutral';
  return 'negative';
}

function getSavingsStatus(savings: number): MetricStatus {
  if (savings > METRIC_THRESHOLDS.savings.positive) return 'positive';
  if (savings > METRIC_THRESHOLDS.savings.neutral) return 'neutral';
  return 'negative';
}

/**
 * Executive summary: 4 key metrics at a glance.
 * Designed for directors and CFOs — large numbers, color-coded, one-line explanations.
 */
export function ExecutiveSummary({ results, onDetailClick }: ExecutiveSummaryProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Investeringsoverzicht</h2>
      <p className="text-sm text-gray-500">
        Kerngetallen van uw batterij-investering op basis van het basisscenario
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          label="Jaarlijkse besparing"
          value={formatEuro(results.annualSavings)}
          status={getSavingsStatus(results.annualSavings)}
          explanation="Verwachte besparing op energiekosten in het eerste jaar"
          onClick={() => onDetailClick?.('savings')}
        />

        <MetricCard
          label="Terugverdientijd"
          value={formatNumber(results.simplePayback, 1)}
          unit="jaar"
          status={getPaybackStatus(results.simplePayback)}
          explanation={
            results.simplePayback <= 10
              ? 'Binnen de economische levensduur van de batterij'
              : 'Langer dan de gemiddelde levensduur — extra aandacht nodig'
          }
          onClick={() => onDetailClick?.('payback')}
        />

        <MetricCard
          label="Netto Contante Waarde"
          value={formatEuro(results.npv)}
          status={getNpvStatus(results.npv)}
          explanation={
            results.npv >= 0
              ? 'Positieve NCW: de investering creëert waarde'
              : 'Negatieve NCW: de investering kost meer dan het oplevert'
          }
          onClick={() => onDetailClick?.('npv')}
        />

        <MetricCard
          label="Rendement (IRR)"
          value={isFinite(results.irr) ? formatPercentage(results.irr) : '—'}
          status={getRoiStatus(results.irr)}
          explanation={
            results.irr > METRIC_THRESHOLDS.irr.wacc
              ? 'Boven de gemiddelde vermogenskostenvoet (WACC)'
              : 'Onder of rond de WACC — beperkt rendement'
          }
          onClick={() => onDetailClick?.('roi')}
        />

        <MetricCard
          label="Verdisconteerde terugverdientijd"
          value={formatNumber(results.discountedPayback, 1)}
          unit="jaar"
          status={getPaybackStatus(results.discountedPayback)}
          explanation="Terugverdientijd gecorrigeerd voor de tijdswaarde van geld (WACC)"
          onClick={() => onDetailClick?.('discountedPayback')}
        />
      </div>
    </div>
  );
}
