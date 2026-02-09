import type { HourlySimulationResult } from '../../types';
import { MetricCard } from '../shared';
import { InfoTooltip } from '../shared';
import { formatPercentage } from '../../utils/format';
import { PEAK_HOURS } from '../../constants';
import { KPI_THRESHOLDS } from '../../constants/kpi-thresholds';

interface GridIndependenceMetricsProps {
  hourlyResults: HourlySimulationResult[];
  annualConsumptionKwh: number;
}

export function GridIndependenceMetrics({ hourlyResults, annualConsumptionKwh }: GridIndependenceMetricsProps) {
  const totalDischarged = hourlyResults.reduce((sum, h) => sum + h.batteryDischarge, 0);

  const selfConsumption = annualConsumptionKwh > 0
    ? totalDischarged / annualConsumptionKwh
    : 0;

  let peakDischargeSum = 0;
  let peakConsumptionSum = 0;

  for (const h of hourlyResults) {
    const hourOfDay = h.hour % 24;
    if (hourOfDay >= PEAK_HOURS.start && hourOfDay < PEAK_HOURS.end) {
      peakDischargeSum += h.batteryDischarge;
      peakConsumptionSum += h.consumption;
    }
  }

  const peakCoverage = peakConsumptionSum > 0
    ? peakDischargeSum / peakConsumptionSum
    : 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-800">Netonafhankelijkheid</h3>
        <InfoTooltip text="Meet hoeveel van uw energieverbruik door de batterij wordt geleverd, zowel overall als specifiek tijdens piekuren (07:00-23:00)." />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MetricCard
          label="Zelfconsumptie"
          value={formatPercentage(selfConsumption)}
          status={selfConsumption >= KPI_THRESHOLDS.gridIndependence.positive ? 'positive' : selfConsumption >= KPI_THRESHOLDS.gridIndependence.neutral ? 'neutral' : 'negative'}
          explanation="Aandeel van het totale verbruik geleverd door de batterij"
        />

        <MetricCard
          label="Piekuur-dekking"
          value={formatPercentage(peakCoverage)}
          status={peakCoverage >= KPI_THRESHOLDS.peakHourCoverage.positive ? 'positive' : peakCoverage >= KPI_THRESHOLDS.peakHourCoverage.neutral ? 'neutral' : 'negative'}
          explanation="Aandeel van het piekuurverbruik (07:00-23:00) geleverd door de batterij"
        />
      </div>

      <p className="mt-3 text-xs text-gray-400">
        Indicatief — gebaseerd op de jaarsimulatie. Werkelijke dekking hangt af van seizoen en verbruikspatroon.
      </p>
    </div>
  );
}
