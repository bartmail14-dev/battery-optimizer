import type {
  BatteryConfig,
  EnergyProfile,
  TariffStructure,
  SubsidyConfig,
  FinancialParams,
} from '../../types';
import { InfoTooltip } from '../shared';
import { formatEuro, formatNumber, formatPercentage } from '../../utils/format';
import {
  SECTOR_LABELS,
  CO2_EMISSION_FACTORS,
  PEAK_HOURS,
  CORPORATE_TAX_RATE,
  SDE_MIN_FULL_LOAD_HOURS,
  SDE_DURATION_YEARS,
  SCENARIO_MULTIPLIERS,
} from '../../constants';
import { SENSITIVITY_RANGES } from '../../constants/sensitivity-ranges';

interface AssumptionsSummaryProps {
  battery: BatteryConfig;
  profile: EnergyProfile;
  tariffs: TariffStructure;
  subsidies: SubsidyConfig;
  financials: FinancialParams;
}

interface Row {
  label: string;
  value: string;
  source?: string;
}

function Section({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-600">{title}</h4>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-gray-100">
              <td className="py-1.5 pr-4 text-gray-500">{r.label}</td>
              <td className="py-1.5 text-right">
                <span className="font-medium text-gray-800">{r.value}</span>
                {r.source && (
                  <span className="block text-xs text-gray-400">{r.source}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function fmtMultiplier(_base: number, mult: number): string {
  const pct = Math.round((mult - 1) * 100);
  return pct >= 0 ? `+${pct}%` : `${pct}%`;
}

export function AssumptionsSummary({
  battery,
  profile,
  tariffs,
  subsidies,
  financials,
}: AssumptionsSummaryProps) {
  const batteryRows: Row[] = [
    { label: 'Capaciteit', value: `${formatNumber(battery.capacityKwh, 0)} kWh` },
    { label: 'Vermogen', value: `${formatNumber(battery.powerKw, 0)} kW` },
    { label: 'Round-trip efficiency', value: formatPercentage(battery.roundTripEfficiency) },
    { label: 'Jaarlijkse degradatie', value: formatPercentage(battery.annualDegradation) },
    { label: 'Cyclusleven', value: `${formatNumber(battery.cycleLife, 0)} cycli` },
    { label: 'Depth of Discharge', value: formatPercentage(battery.depthOfDischarge) },
    { label: 'Kosten per kWh', value: `${formatEuro(battery.costPerKwh)}/kWh` },
    { label: 'Installatiekosten', value: formatEuro(battery.installationCost) },
    { label: 'Jaarlijks onderhoud', value: `${formatEuro(battery.annualMaintenanceCost)}/jaar` },
    { label: 'Verwachte levensduur', value: `${battery.lifespanYears} jaar` },
  ];

  const profileRows: Row[] = [
    { label: 'Sector', value: SECTOR_LABELS[profile.sector] },
    { label: 'Jaarverbruik', value: `${formatNumber(profile.annualConsumptionKwh, 0)} kWh` },
    { label: 'Piekvraag', value: `${formatNumber(profile.peakDemandKw, 0)} kW` },
    { label: 'Aansluitcapaciteit', value: `${formatNumber(profile.connectionCapacityKw, 0)} kW` },
    { label: 'Databron', value: profile.dataSource === 'csv' ? 'CSV-upload' : 'Synthetisch profiel' },
  ];

  const tariffRows: Row[] = [
    { label: 'Piektarief', value: `${formatEuro(tariffs.peakRate, 4)}/kWh` },
    { label: 'Daltarief', value: `${formatEuro(tariffs.offPeakRate, 4)}/kWh` },
    { label: 'Netwerktarief', value: `${formatEuro(tariffs.networkTariffPerKw)}/kW/jaar` },
    { label: 'Energiebelasting', value: `${formatEuro(tariffs.energyTaxPerKwh, 4)}/kWh` },
    { label: 'ODE-heffing', value: `${formatEuro(tariffs.odeSurchargePerKwh, 4)}/kWh` },
    { label: 'Teruglevertarief', value: `${formatEuro(tariffs.feedInTariffPerKwh, 4)}/kWh` },
    { label: 'Prijsmodus', value: tariffs.pricingMode === 'dynamic' ? 'Dynamisch (EPEX)' : 'Vast piek/dal' },
  ];

  const subsidyRows: Row[] = [
    { label: 'SDE++', value: subsidies.sdeEligible ? 'Ja' : 'Nee' },
    { label: 'SDE++ basisbedrag', value: `${formatEuro(subsidies.sdeBaseAmount, 3)}/kWh` },
    { label: 'EIA-percentage', value: formatPercentage(subsidies.eiaPercentage) },
    { label: 'EIA max. aftrek', value: formatEuro(subsidies.eiaMaxDeduction) },
  ];

  const financialRows: Row[] = [
    { label: 'Discontovoet (WACC)', value: formatPercentage(financials.discountRate) },
    { label: 'Inflatie', value: formatPercentage(financials.inflationRate) },
    { label: 'Elektriciteitsprijsgroei', value: formatPercentage(financials.electricityPriceGrowthRate) },
    { label: 'Analyseperiode', value: `${financials.years} jaar` },
  ];

  const hiddenAssumptionRows: Row[] = [
    { label: 'CO\u2082 emissiefactor piekuren', value: `${CO2_EMISSION_FACTORS.peakHourMarginal} kg/kWh`, source: 'Marginale emissie gascentrale — CBS/IPCC 2023' },
    { label: 'CO\u2082 emissiefactor daluren', value: `${CO2_EMISSION_FACTORS.offPeakMarginal} kg/kWh`, source: 'CBS/IPCC 2023' },
    { label: 'Piekuren definitie', value: `${String(PEAK_HOURS.start).padStart(2, '0')}:00\u2013${String(PEAK_HOURS.end).padStart(2, '0')}:00`, source: 'EPEX marktconventie' },
    { label: 'Vpb-tarief (EIA)', value: formatPercentage(CORPORATE_TAX_RATE), source: 'Belastingdienst 2024' },
    { label: 'SDE++ minimaal vollasturen', value: `${SDE_MIN_FULL_LOAD_HOURS} uur/jaar`, source: 'RVO' },
    { label: 'SDE++ looptijd', value: `${SDE_DURATION_YEARS} jaar`, source: 'RVO' },
  ];

  const opt = SCENARIO_MULTIPLIERS.optimistic;
  const pes = SCENARIO_MULTIPLIERS.pessimistic;
  const SR = SENSITIVITY_RANGES;

  const scenarioRows: Row[] = [
    { label: 'Scenario: energieprijsgroei', value: `${fmtMultiplier(1, pes.electricityPriceGrowth)} / ${fmtMultiplier(1, opt.electricityPriceGrowth)}`, source: 'Pessimistisch / Optimistisch' },
    { label: 'Scenario: batterijkosten', value: `${fmtMultiplier(1, pes.batteryCost)} / ${fmtMultiplier(1, opt.batteryCost)}`, source: 'Pessimistisch / Optimistisch' },
    { label: 'Scenario: WACC', value: `${fmtMultiplier(1, pes.discountRate)} / ${fmtMultiplier(1, opt.discountRate)}`, source: 'Pessimistisch / Optimistisch' },
    { label: 'Sensitivity: energieprijs', value: `\u00D7${SR.electricityPrice.low} / \u00D7${SR.electricityPrice.high}`, source: 'Range voor tornadochart' },
    { label: 'Sensitivity: batterijkosten', value: `\u00D7${SR.batteryCost.low} / \u00D7${SR.batteryCost.high}`, source: 'Range voor tornadochart' },
    { label: 'Sensitivity: WACC', value: `\u00D7${SR.discountRate.low} / \u00D7${SR.discountRate.high}`, source: 'Range voor tornadochart' },
    { label: 'Sensitivity: degradatie', value: `\u00D7${SR.degradation.low} / \u00D7${SR.degradation.high}`, source: 'Range voor tornadochart' },
    { label: 'Sensitivity: prijsgroei', value: `\u00D7${SR.priceGrowth.low} / \u00D7${SR.priceGrowth.high}`, source: 'Range voor tornadochart' },
  ];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-800">Aannames en inputparameters</h3>
        <InfoTooltip text="Volledig overzicht van alle parameters die zijn gebruikt voor deze berekening. Controleer deze zorgvuldig voordat u de resultaten deelt." />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Section title="Batterij" rows={batteryRows} />
        <Section title="Energieprofiel" rows={profileRows} />
        <Section title="Tarieven" rows={tariffRows} />
        <Section title="Subsidie" rows={subsidyRows} />
        <Section title="Financieel" rows={financialRows} />
        <Section title="Berekende aannames" rows={hiddenAssumptionRows} />
        <Section title="Scenario & gevoeligheid" rows={scenarioRows} />
      </div>

      <p className="mt-4 text-xs text-gray-400">
        Alle waarden zijn configureerbaar. Bronnen: Belastingdienst, RVO, CBS/IPCC, EPEX SPOT, COMCAM marktanalyse 2024.
      </p>
    </div>
  );
}
