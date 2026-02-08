import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Battery, Building2, Hotel, HelpCircle, Heart, Store, Landmark, Factory, Truck, GraduationCap, MoreHorizontal } from 'lucide-react';
import { clsx } from 'clsx';
import type { BatteryConfig, Sector } from '../../types';
import { PRESETS } from '../../constants/presets';
import { SECTOR_LABELS } from '../../constants/dutch-energy-market';
import { InfoTooltip } from '../shared';

const SECTOR_VALUES: Sector[] = ['hospitality', 'healthcare', 'retail', 'kantoor', 'industrie', 'logistiek', 'onderwijs', 'overig'];

const batterySchema = z.object({
  capacityKwh: z.number().min(10, 'Minimaal 10 kWh').max(10000, 'Maximaal 10.000 kWh'),
  powerKw: z.number().min(5, 'Minimaal 5 kW').max(5000, 'Maximaal 5.000 kW'),
  roundTripEfficiency: z.number().min(0.7, 'Min 70%').max(0.99, 'Max 99%'),
  annualDegradation: z.number().min(0.005, 'Min 0,5%').max(0.1, 'Max 10%'),
  cycleLife: z.number().min(1000).max(20000),
  depthOfDischarge: z.number().min(0.5).max(1.0),
  costPerKwh: z.number().min(100, 'Min € 100/kWh').max(2000, 'Max € 2.000/kWh'),
  installationCost: z.number().min(0).max(500000),
  annualMaintenanceCost: z.number().min(0).max(100000),
  lifespanYears: z.number().min(5).max(30),
  // Energy profile fields
  sector: z.enum(['hospitality', 'healthcare', 'retail', 'kantoor', 'industrie', 'logistiek', 'onderwijs', 'overig']),
  annualConsumptionKwh: z.number().min(10000, 'Min 10.000 kWh').max(50000000, 'Max 50.000.000 kWh'),
  peakDemandKw: z.number().min(10).max(10000),
  connectionCapacityKw: z.number().min(10).max(10000),
});

type FormData = z.infer<typeof batterySchema>;

interface BatteryConfiguratorProps {
  defaultValues: BatteryConfig & {
    sector: Sector;
    annualConsumptionKwh: number;
    peakDemandKw: number;
    connectionCapacityKw: number;
  };
  onSubmit: (data: FormData) => void;
  isCalculating: boolean;
  hasCustomProfile?: boolean;
}

const sectorIcons: Record<Sector, typeof Hotel> = {
  hospitality: Hotel,
  healthcare: Heart,
  retail: Store,
  kantoor: Landmark,
  industrie: Factory,
  logistiek: Truck,
  onderwijs: GraduationCap,
  overig: MoreHorizontal,
};

export function BatteryConfigurator({ defaultValues, onSubmit, isCalculating, hasCustomProfile }: BatteryConfiguratorProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(batterySchema),
    defaultValues,
  });

  const sector = watch('sector');

  function applyPreset(presetIndex: number) {
    const preset = PRESETS[presetIndex];
    if (!preset) return;

    const bc = preset.batteryConfig;
    const ep = preset.energyProfile;

    if (bc.capacityKwh !== undefined) setValue('capacityKwh', bc.capacityKwh);
    if (bc.powerKw !== undefined) setValue('powerKw', bc.powerKw);
    if (bc.costPerKwh !== undefined) setValue('costPerKwh', bc.costPerKwh);
    if (bc.installationCost !== undefined) setValue('installationCost', bc.installationCost);
    if (bc.annualMaintenanceCost !== undefined) setValue('annualMaintenanceCost', bc.annualMaintenanceCost);
    if (bc.lifespanYears !== undefined) setValue('lifespanYears', bc.lifespanYears);
    if (bc.roundTripEfficiency !== undefined) setValue('roundTripEfficiency', bc.roundTripEfficiency);
    if (bc.annualDegradation !== undefined) setValue('annualDegradation', bc.annualDegradation);
    if (bc.cycleLife !== undefined) setValue('cycleLife', bc.cycleLife);
    if (bc.depthOfDischarge !== undefined) setValue('depthOfDischarge', bc.depthOfDischarge);
    if (ep.annualConsumptionKwh !== undefined) setValue('annualConsumptionKwh', ep.annualConsumptionKwh);
    if (ep.peakDemandKw !== undefined) setValue('peakDemandKw', ep.peakDemandKw);
    if (ep.connectionCapacityKw !== undefined) setValue('connectionCapacityKw', ep.connectionCapacityKw);
    setValue('sector', preset.sector);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Preset Selection */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-3">
          Kies een profiel of vul handmatig in
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {PRESETS.map((preset, i) => {
            const Icon = sectorIcons[preset.sector];
            return (
              <button
                key={preset.name}
                type="button"
                className="flex flex-col items-center gap-2 rounded-xl border-2 border-gray-200 p-4 text-sm transition hover:border-blue-400 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={() => applyPreset(i)}
              >
                <Icon className="h-6 w-6 text-blue-600" />
                <span className="font-medium">{preset.name}</span>
                <span className="text-xs text-gray-500">{preset.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sector */}
      <fieldset>
        <legend className="text-base font-semibold text-gray-800 mb-2">Sector</legend>
        {hasCustomProfile && (
          <p className="mb-2 text-xs text-blue-600">
            Uw geuploade verbruiksdata wordt gebruikt. Sector is alleen voor rapportage.
          </p>
        )}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SECTOR_VALUES.map((s) => {
            const Icon = sectorIcons[s];
            return (
              <label
                key={s}
                className={clsx(
                  'flex cursor-pointer items-center gap-2 rounded-lg border-2 px-3 py-2 transition',
                  sector === s ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <input
                  type="radio"
                  value={s}
                  {...register('sector')}
                  className="sr-only"
                />
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium">{SECTOR_LABELS[s]}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Energy Profile */}
      <fieldset className="space-y-4">
        <legend className="text-base font-semibold text-gray-800 mb-2 flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Energieprofiel
        </legend>

        <div className="grid gap-4 sm:grid-cols-3">
          <InputField
            label="Jaarverbruik"
            unit="kWh"
            tooltip="Totaal elektriciteitsverbruik per jaar. Staat op uw jaarafrekening."
            error={errors.annualConsumptionKwh?.message}
            {...register('annualConsumptionKwh', { valueAsNumber: true })}
          />
          <InputField
            label="Piekvermogen"
            unit="kW"
            tooltip="Maximaal gelijktijdig vermogen dat u afneemt. Bepaalt uw netwerktarief."
            error={errors.peakDemandKw?.message}
            {...register('peakDemandKw', { valueAsNumber: true })}
          />
          <InputField
            label="Aansluitcapaciteit"
            unit="kW"
            tooltip="Capaciteit van uw netaansluiting. Staat in uw contract met de netbeheerder."
            error={errors.connectionCapacityKw?.message}
            {...register('connectionCapacityKw', { valueAsNumber: true })}
          />
        </div>
      </fieldset>

      {/* Battery Config */}
      <fieldset className="space-y-4">
        <legend className="text-base font-semibold text-gray-800 mb-2 flex items-center gap-2">
          <Battery className="h-5 w-5" />
          Batterijconfiguratie
        </legend>

        <div className="grid gap-4 sm:grid-cols-3">
          <InputField
            label="Capaciteit"
            unit="kWh"
            tooltip="Hoeveel energie de batterij kan opslaan. Vergelijkbaar met het formaat van een watertank."
            error={errors.capacityKwh?.message}
            {...register('capacityKwh', { valueAsNumber: true })}
          />
          <InputField
            label="Vermogen"
            unit="kW"
            tooltip="Hoe snel de batterij kan laden en ontladen. Vergelijkbaar met de diameter van een kraan."
            error={errors.powerKw?.message}
            {...register('powerKw', { valueAsNumber: true })}
          />
          <InputField
            label="Kosten per kWh"
            unit="EUR/kWh"
            tooltip="Aanschafprijs per kWh opslagcapaciteit. Marktgemiddelde 2024: € 400-700/kWh."
            error={errors.costPerKwh?.message}
            {...register('costPerKwh', { valueAsNumber: true })}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <InputField
            label="Installatiekosten"
            unit="EUR"
            tooltip="Eenmalige kosten voor installatie, bekabeling en inbedrijfstelling."
            error={errors.installationCost?.message}
            {...register('installationCost', { valueAsNumber: true })}
          />
          <InputField
            label="Jaarlijks onderhoud"
            unit="EUR/jaar"
            tooltip="Verwachte jaarlijkse kosten voor onderhoud en monitoring."
            error={errors.annualMaintenanceCost?.message}
            {...register('annualMaintenanceCost', { valueAsNumber: true })}
          />
          <InputField
            label="Levensduur"
            unit="jaar"
            tooltip="Verwachte economische levensduur van het batterijsysteem."
            error={errors.lifespanYears?.message}
            {...register('lifespanYears', { valueAsNumber: true })}
          />
        </div>

        {/* Advanced settings */}
        <details className="rounded-lg border border-gray-200 p-4">
          <summary className="cursor-pointer text-sm font-medium text-gray-600 flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            Geavanceerde instellingen
          </summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <InputField
              label="Efficiency (round-trip)"
              unit=""
              tooltip="Percentage energie dat behouden blijft na laden en ontladen. Typisch 85-92% voor Li-ion."
              error={errors.roundTripEfficiency?.message}
              step="0.01"
              {...register('roundTripEfficiency', { valueAsNumber: true })}
            />
            <InputField
              label="Degradatie"
              unit="/jaar"
              tooltip="Jaarlijks capaciteitsverlies. Typisch 2-3% per jaar."
              error={errors.annualDegradation?.message}
              step="0.005"
              {...register('annualDegradation', { valueAsNumber: true })}
            />
            <InputField
              label="Cyclusleven"
              unit="cycli"
              tooltip="Aantal laad/ontlaad-cycli voordat de batterij is versleten."
              error={errors.cycleLife?.message}
              {...register('cycleLife', { valueAsNumber: true })}
            />
            <InputField
              label="Ontlaaddiepte (DoD)"
              unit=""
              tooltip="Hoeveel van de capaciteit daadwerkelijk gebruikt wordt. Hogere DoD = meer slijtage."
              error={errors.depthOfDischarge?.message}
              step="0.05"
              {...register('depthOfDischarge', { valueAsNumber: true })}
            />
          </div>
        </details>
      </fieldset>

      {/* Submit */}
      <button
        type="submit"
        disabled={isCalculating}
        className={clsx(
          'w-full rounded-xl py-4 text-lg font-semibold text-white transition',
          isCalculating
            ? 'cursor-wait bg-gray-400'
            : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300'
        )}
      >
        {isCalculating ? 'Berekening loopt...' : 'Bereken investeringsrendement'}
      </button>
    </form>
  );
}

// Reusable input field component
interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  unit: string;
  tooltip: string;
  error?: string;
}

import { forwardRef } from 'react';

const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  function InputField({ label, unit, tooltip, error, ...inputProps }, ref) {
    return (
      <div>
        <label className="mb-1 flex items-center gap-1 text-sm font-medium text-gray-700">
          {label}
          {unit && <span className="text-gray-400">({unit})</span>}
          <InfoTooltip text={tooltip} />
        </label>
        <input
          ref={ref}
          type="number"
          className={clsx(
            'w-full rounded-lg border px-3 py-2 text-sm transition focus:outline-none focus:ring-2',
            error
              ? 'border-red-300 focus:ring-red-500'
              : 'border-gray-300 focus:ring-blue-500'
          )}
          {...inputProps}
        />
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);
