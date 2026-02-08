import { InfoTooltip } from '../shared';
import { formatNumber } from '../../utils/format';

interface CycleLifeIndicatorProps {
  totalCycles: number;
  cycleLife: number;
  lifespanYears: number;
}

export function CycleLifeIndicator({ totalCycles, cycleLife, lifespanYears }: CycleLifeIndicatorProps) {
  const cycleLifeYears = totalCycles > 0 ? cycleLife / totalCycles : Infinity;
  const usedPerYear = totalCycles;
  const progressPct = cycleLife > 0 ? Math.min((totalCycles / cycleLife) * 100, 100) : 0;
  const wearsOutEarly = isFinite(cycleLifeYears) && cycleLifeYears < lifespanYears;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-800">Cyclus-levensduur</h3>
        <InfoTooltip text="Vergelijkt het jaarlijkse cyclusverbruik met de totale levensduur van de batterij. Als de batterij eerder slijt dan de analyseperiode, heeft dit impact op de businesscase." />
      </div>

      <div className="mb-3 text-sm text-gray-600">
        <span className="font-medium">{formatNumber(usedPerYear, 0)}</span> van{' '}
        <span className="font-medium">{formatNumber(cycleLife, 0)}</span> cycli per jaar
      </div>

      <div className="h-4 w-full rounded-full bg-gray-200">
        <div
          className={`h-4 rounded-full transition-all ${
            progressPct > 80 ? 'bg-red-500' : progressPct > 50 ? 'bg-amber-500' : 'bg-green-500'
          }`}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="mt-3 flex justify-between text-sm text-gray-500">
        <span>{formatNumber(progressPct, 1)}% per jaar verbruikt</span>
        <span>
          Verwachte levensduur:{' '}
          <strong className="text-gray-800">
            {isFinite(cycleLifeYears) ? `${formatNumber(cycleLifeYears, 1)} jaar` : '> 20 jaar'}
          </strong>
        </span>
      </div>

      {wearsOutEarly && (
        <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          De batterij slijt naar verwachting na{' '}
          <strong>{formatNumber(cycleLifeYears, 1)} jaar</strong>, terwijl de analyseperiode{' '}
          <strong>{lifespanYears} jaar</strong> beslaat. Houd rekening met vervanging.
        </div>
      )}
    </div>
  );
}
