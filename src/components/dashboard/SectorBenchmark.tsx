import type { Sector } from '../../types';
import { PAYBACK_BENCHMARKS, SECTOR_LABELS } from '../../constants';
import { InfoTooltip } from '../shared';
import { formatNumber } from '../../utils/format';

interface SectorBenchmarkProps {
  simplePayback: number;
  sector: Sector;
  subsidyEnabled: boolean;
}

export function SectorBenchmark({ simplePayback, sector, subsidyEnabled }: SectorBenchmarkProps) {
  const benchmark = PAYBACK_BENCHMARKS[sector];
  const range = subsidyEnabled ? benchmark.withSubsidy : benchmark.withoutSubsidy;
  const sectorLabel = SECTOR_LABELS[sector];
  const subsidyLabel = subsidyEnabled ? 'met subsidie' : 'zonder subsidie';

  const maxScale = Math.max(range.high + 2, simplePayback + 2, 15);

  const lowPct = (range.low / maxScale) * 100;
  const midPct = (range.mid / maxScale) * 100;
  const highPct = (range.high / maxScale) * 100;
  const markerPct = isFinite(simplePayback)
    ? Math.min((simplePayback / maxScale) * 100, 100)
    : 100;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-800">Terugverdientijd vs sector</h3>
        <InfoTooltip text={`Vergelijkt uw berekende terugverdientijd met de benchmark voor de sector ${sectorLabel} (${subsidyLabel}). Bron: COMCAM marktanalyse.`} />
      </div>

      <p className="mb-3 text-sm text-gray-500">
        {sectorLabel} — {subsidyLabel}
      </p>

      <div className="relative mt-4 mb-8">
        {/* Track */}
        <div className="h-3 w-full rounded-full bg-gray-200" />

        {/* Range bar */}
        <div
          className="absolute top-0 h-3 rounded-full bg-blue-200"
          style={{ left: `${lowPct}%`, width: `${highPct - lowPct}%` }}
        />

        {/* Mid marker */}
        <div
          className="absolute top-0 h-3 w-0.5 bg-blue-500"
          style={{ left: `${midPct}%` }}
        />

        {/* Your payback marker */}
        <div
          className="absolute -top-1 flex flex-col items-center"
          style={{ left: `${markerPct}%`, transform: 'translateX(-50%)' }}
        >
          <div className="h-5 w-1 rounded bg-green-600" />
          <span className="mt-1 whitespace-nowrap text-xs font-bold text-green-700">
            {isFinite(simplePayback) ? `${formatNumber(simplePayback, 1)} jr` : '> 20 jr'}
          </span>
        </div>

        {/* Labels */}
        <div className="mt-4 flex justify-between text-xs text-gray-500">
          <span>{formatNumber(range.low, 0)} jr</span>
          <span className="text-blue-600 font-medium">Mediaan: {formatNumber(range.mid, 1)} jr</span>
          <span>{formatNumber(range.high, 0)} jr</span>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Indicatief — werkelijke terugverdientijden variëren per situatie. Bron: COMCAM sectoranalyse.
      </p>
    </div>
  );
}
