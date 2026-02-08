import { BATTERY_COST_RANGE } from '../../constants';
import { InfoTooltip } from '../shared';
import { formatEuro } from '../../utils/format';

interface BatteryCostBenchmarkProps {
  costPerKwh: number;
}

export function BatteryCostBenchmark({ costPerKwh }: BatteryCostBenchmarkProps) {
  const maxScale = Math.max(BATTERY_COST_RANGE.high + 100, costPerKwh + 100);

  const lowPct = (BATTERY_COST_RANGE.low / maxScale) * 100;
  const midPct = (BATTERY_COST_RANGE.mid / maxScale) * 100;
  const highPct = (BATTERY_COST_RANGE.high / maxScale) * 100;
  const markerPct = Math.min((costPerKwh / maxScale) * 100, 100);

  const isCompetitive = costPerKwh <= BATTERY_COST_RANGE.mid;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-800">Batterijkosten vs markt</h3>
        <InfoTooltip text="Vergelijkt uw geconfigureerde batterijkosten per kWh met de huidige marktrange. Bron: BloombergNEF / NVDE 2024." />
      </div>

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

        {/* Your cost marker */}
        <div
          className="absolute -top-1 flex flex-col items-center"
          style={{ left: `${markerPct}%`, transform: 'translateX(-50%)' }}
        >
          <div className={`h-5 w-1 rounded ${isCompetitive ? 'bg-green-600' : 'bg-amber-600'}`} />
          <span className={`mt-1 whitespace-nowrap text-xs font-bold ${isCompetitive ? 'text-green-700' : 'text-amber-700'}`}>
            {formatEuro(costPerKwh)}/kWh
          </span>
        </div>

        {/* Labels */}
        <div className="mt-4 flex justify-between text-xs text-gray-500">
          <span>{formatEuro(BATTERY_COST_RANGE.low)}/kWh</span>
          <span className="text-blue-600 font-medium">Mediaan: {formatEuro(BATTERY_COST_RANGE.mid)}/kWh</span>
          <span>{formatEuro(BATTERY_COST_RANGE.high)}/kWh</span>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        All-in kosten inclusief BMS en garantie. Bron: BloombergNEF / NVDE 2024.
      </p>
    </div>
  );
}
