import type { AnnualSimulationResult, BatteryConfig } from '../../types';
import { MetricCard } from '../shared';
import type { MetricStatus } from '../shared';
import { InfoTooltip } from '../shared';
import { formatNumber, formatPercentage } from '../../utils/format';

interface BatteryUtilizationKPIsProps {
  simulation: AnnualSimulationResult;
  battery: BatteryConfig;
}

function getUtilizationStatus(pct: number): MetricStatus {
  if (pct >= 60 && pct <= 90) return 'positive';
  if (pct >= 30 && pct <= 60) return 'neutral';
  return 'negative';
}

export function BatteryUtilizationKPIs({ simulation, battery }: BatteryUtilizationKPIsProps) {
  const usableCapacity = battery.capacityKwh * battery.depthOfDischarge;
  const maxDailyThroughput = Math.min(usableCapacity, battery.powerKw * 12);
  const maxAnnualThroughput = maxDailyThroughput * 365;
  const utilization = maxAnnualThroughput > 0
    ? (simulation.totalDischarged / maxAnnualThroughput) * 100
    : 0;

  const avgCyclesPerDay = simulation.totalCycles / 365;

  const energyThroughputMwh = (simulation.totalCharged + simulation.totalDischarged) / 1000;

  const actualEfficiency = simulation.totalCharged > 0
    ? simulation.totalDischarged / simulation.totalCharged
    : 0;

  const theoreticalEfficiency = battery.roundTripEfficiency;

  const cycleLifeYears = simulation.totalCycles > 0
    ? battery.cycleLife / simulation.totalCycles
    : Infinity;
  const remainingLifespan = Math.min(cycleLifeYears, battery.lifespanYears);
  const lifespanProgress = battery.lifespanYears > 0
    ? (remainingLifespan / battery.lifespanYears) * 100
    : 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-800">Batterijbenutting</h3>
        <InfoTooltip text="Kernprestatie-indicatoren van het batterijsysteem op basis van de jaarsimulatie. Optimale benutting ligt tussen 60-90%." />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          label="Capaciteitsbenutting"
          value={formatNumber(utilization, 1)}
          unit="%"
          status={getUtilizationStatus(utilization)}
          explanation={
            utilization < 30
              ? 'Batterij is oversized voor dit profiel'
              : utilization > 90
                ? 'Batterij is zwaar belast — overweeg grotere capaciteit'
                : 'Goede benutting van de batterijcapaciteit'
          }
        />

        <MetricCard
          label="Gemiddelde cycli/dag"
          value={formatNumber(avgCyclesPerDay, 2)}
          status={avgCyclesPerDay >= 0.5 && avgCyclesPerDay <= 1.5 ? 'positive' : 'neutral'}
          explanation={`${formatNumber(simulation.totalCycles, 0)} cycli per jaar`}
        />

        <MetricCard
          label="Energiedoorvoer"
          value={formatNumber(energyThroughputMwh, 1)}
          unit="MWh/jaar"
          status="neutral"
          explanation={`${formatNumber(simulation.totalCharged, 0)} kWh geladen, ${formatNumber(simulation.totalDischarged, 0)} kWh ontladen`}
        />

        <MetricCard
          label="Werkelijk rendement"
          value={formatPercentage(actualEfficiency)}
          status={actualEfficiency >= theoreticalEfficiency * 0.95 ? 'positive' : 'neutral'}
          explanation={`Op basis van gemeten in/uit-verhouding`}
        />

        <MetricCard
          label="Theoretisch rendement"
          value={formatPercentage(theoreticalEfficiency)}
          status="neutral"
          explanation="Fabrikant round-trip efficiency specificatie"
        />

        <div className="rounded-xl border-2 p-6 text-gray-700 bg-gray-50 border-gray-200">
          <p className="text-sm font-medium uppercase tracking-wide opacity-70">
            Resterende levensduur
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight">
              {isFinite(remainingLifespan) ? formatNumber(remainingLifespan, 1) : '> 20'}
            </span>
            <span className="text-lg opacity-60">jaar</span>
          </div>
          <div className="mt-3 h-2 w-full rounded-full bg-gray-200">
            <div
              className="h-2 rounded-full bg-green-500 transition-all"
              style={{ width: `${Math.min(lifespanProgress, 100)}%` }}
            />
          </div>
          <p className="mt-2 text-xs opacity-60 leading-relaxed">
            {cycleLifeYears < battery.lifespanYears
              ? 'Beperkt door cyclusslijtage'
              : 'Beperkt door kalenderlevensduur'}
          </p>
        </div>
      </div>
    </div>
  );
}
