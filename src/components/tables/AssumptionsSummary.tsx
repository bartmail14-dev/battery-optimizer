import type {
  BatteryConfig,
  EnergyProfile,
  TariffStructure,
  SubsidyConfig,
  FinancialParams,
} from '../../types';
import { InfoTooltip } from '../shared';
import { formatEuro, formatNumber, formatPercentage } from '../../utils/format';
import { SECTOR_LABELS } from '../../constants';

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
              <td className="py-1.5 text-right font-medium text-gray-800">{r.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
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
      </div>
    </div>
  );
}
