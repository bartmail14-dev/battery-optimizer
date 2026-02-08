import type { PaybackConfidence } from '../../types';
import { MetricCard } from '../shared';
import { InfoTooltip } from '../shared';
import { formatNumber } from '../../utils/format';

interface PaybackConfidenceRangeProps {
  paybackConfidence: PaybackConfidence;
}

function getConfidenceColor(label: string): string {
  if (label === 'hoog') return 'text-green-700 bg-green-100';
  if (label === 'midden') return 'text-amber-700 bg-amber-100';
  return 'text-red-700 bg-red-100';
}

export function PaybackConfidenceRange({ paybackConfidence }: PaybackConfidenceRangeProps) {
  const { optimistic, base, pessimistic, confidence } = paybackConfidence;

  // Cap non-finite values at 25 years for visualization
  const safeOpt = isFinite(optimistic) ? optimistic : 25;
  const safeBase = isFinite(base) ? base : 25;
  const safePess = isFinite(pessimistic) ? pessimistic : 25;

  const maxVal = Math.max(safePess, 20);
  const optPct = Math.min((safeOpt / maxVal) * 100, 100);
  const basePct = Math.min((safeBase / maxVal) * 100, 100);
  const pessPct = Math.min((safePess / maxVal) * 100, 100);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-800">
          Terugverdientijd — betrouwbaarheidsbereik
        </h3>
        <InfoTooltip text="Visueel bereik van de terugverdientijd over drie scenario's: optimistisch, basis en pessimistisch. De breedte van de band geeft de onzekerheid weer." />
        <span className={`ml-2 rounded-full px-3 py-0.5 text-xs font-semibold ${getConfidenceColor(confidence)}`}>
          Betrouwbaarheid: {confidence}
        </span>
      </div>

      {/* Horizontal confidence band */}
      <div className="relative mx-auto mt-6 mb-8 w-full max-w-lg">
        {/* Scale labels */}
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>0 jaar</span>
          <span>{formatNumber(maxVal, 0)} jaar</span>
        </div>

        {/* Track */}
        <div className="relative h-8 w-full rounded-full bg-gray-100">
          {/* Green zone: 0 to optimistic */}
          <div
            className="absolute inset-y-0 left-0 rounded-l-full bg-green-400"
            style={{ width: `${optPct}%` }}
          />
          {/* Amber zone: optimistic to base */}
          <div
            className="absolute inset-y-0 bg-amber-400"
            style={{ left: `${optPct}%`, width: `${basePct - optPct}%` }}
          />
          {/* Red zone: base to pessimistic */}
          <div
            className="absolute inset-y-0 rounded-r-full bg-red-400"
            style={{ left: `${basePct}%`, width: `${pessPct - basePct}%` }}
          />

          {/* Markers */}
          <div className="absolute top-full mt-1 text-xs font-medium text-green-700" style={{ left: `${optPct}%`, transform: 'translateX(-50%)' }}>
            {formatNumber(optimistic, 1)}
          </div>
          <div className="absolute top-full mt-1 text-xs font-medium text-amber-700" style={{ left: `${basePct}%`, transform: 'translateX(-50%)' }}>
            {formatNumber(base, 1)}
          </div>
          <div className="absolute top-full mt-1 text-xs font-medium text-red-700" style={{ left: `${pessPct}%`, transform: 'translateX(-50%)' }}>
            {formatNumber(pessimistic, 1)}
          </div>
        </div>

        {/* Labels below markers */}
        <div className="flex justify-between mt-6 text-xs text-gray-500">
          <span style={{ marginLeft: `calc(${optPct}% - 2rem)` }}>Optimistisch</span>
          <span>Basis</span>
          <span style={{ marginRight: `calc(${100 - pessPct}% - 2rem)` }}>Pessimistisch</span>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard
          label="Optimistisch"
          value={formatNumber(optimistic, 1)}
          unit="jaar"
          status="positive"
          explanation="Gunstige marktomstandigheden"
        />
        <MetricCard
          label="Basisscenario"
          value={formatNumber(base, 1)}
          unit="jaar"
          status="neutral"
          explanation="Verwachte marktomstandigheden"
        />
        <MetricCard
          label="Pessimistisch"
          value={formatNumber(pessimistic, 1)}
          unit="jaar"
          status="negative"
          explanation="Ongunstige marktomstandigheden"
        />
      </div>

      <p className="mt-2 text-xs text-gray-400">
        Indicatief — bandbreedte gebaseerd op scenario-analyse. Werkelijke terugverdientijd hangt af van toekomstige marktprijzen en regelgeving.
      </p>
    </div>
  );
}
