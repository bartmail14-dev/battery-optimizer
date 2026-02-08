import { MetricCard } from '../shared';
import { InfoTooltip } from '../shared';
import { formatNumber } from '../../utils/format';

interface CO2ReductionCardProps {
  co2ReductionKg: number;
}

export function CO2ReductionCard({ co2ReductionKg }: CO2ReductionCardProps) {
  const treesEquivalent = Math.round(co2ReductionKg / 22);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-800">CO2-reductie</h3>
        <InfoTooltip text="Geschatte jaarlijkse CO2-besparing door piekverschuiving van gascentrale-uren naar daluren. Equivalent berekend op basis van ~22 kg CO2 per boom per jaar." />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MetricCard
          label="Jaarlijkse CO2-reductie"
          value={formatNumber(co2ReductionKg, 0)}
          unit="kg CO2"
          status="positive"
          explanation="Door verschuiving van piek- naar daluurverbruik"
        />

        <MetricCard
          label="Bomen-equivalent"
          value={formatNumber(treesEquivalent, 0)}
          unit="bomen/jaar"
          status="positive"
          explanation="Equivalent aan het jaarlijkse CO2-absorptievermogen"
        />
      </div>

      <p className="mt-3 text-xs text-gray-400">
        Indicatief — berekening gaat uit van gemiddelde emissiefactoren. Werkelijke CO2-reductie hangt af van de actuele brandstofmix op het moment van laden en ontladen.
      </p>
    </div>
  );
}
