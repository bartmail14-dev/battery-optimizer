import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Battery, Building2, Hotel, HelpCircle, Heart, Store, Landmark, Factory, Truck, GraduationCap, MoreHorizontal, Sparkles, Zap } from 'lucide-react';
import { clsx } from 'clsx';
import type { BatteryConfig, Sector } from '../../types';
import { SECTOR_LABELS } from '../../constants/dutch-energy-market';
import { VALIDATION } from '../../constants/validation-ranges';
import { InfoTooltip } from '../shared';
import type { SizingRecommendation } from '../../services/calculations/battery-sizing';

const V = VALIDATION;
const SECTOR_VALUES: Sector[] = ['hospitality', 'healthcare', 'retail', 'kantoor', 'industrie', 'logistiek', 'onderwijs', 'overig'];

const batterySchema = z.object({
  capacityKwh: z.number().min(V.battery.capacityKwh.min, `Minimaal ${V.battery.capacityKwh.min} kWh`).max(V.battery.capacityKwh.max, `Maximaal ${V.battery.capacityKwh.max.toLocaleString('nl-NL')} kWh`),
  powerKw: z.number().min(V.battery.powerKw.min, `Minimaal ${V.battery.powerKw.min} kW`).max(V.battery.powerKw.max, `Maximaal ${V.battery.powerKw.max.toLocaleString('nl-NL')} kW`),
  roundTripEfficiency: z.number().min(V.battery.roundTripEfficiency.min, `Min ${V.battery.roundTripEfficiency.min * 100}%`).max(V.battery.roundTripEfficiency.max, `Max ${V.battery.roundTripEfficiency.max * 100}%`),
  annualDegradation: z.number().min(V.battery.annualDegradation.min, `Min ${V.battery.annualDegradation.min * 100}%`).max(V.battery.annualDegradation.max, `Max ${V.battery.annualDegradation.max * 100}%`),
  cycleLife: z.number().min(V.battery.cycleLife.min).max(V.battery.cycleLife.max),
  depthOfDischarge: z.number().min(V.battery.depthOfDischarge.min).max(V.battery.depthOfDischarge.max),
  costPerKwh: z.number().min(V.battery.costPerKwh.min, `Min \u20AC ${V.battery.costPerKwh.min}/kWh`).max(V.battery.costPerKwh.max, `Max \u20AC ${V.battery.costPerKwh.max.toLocaleString('nl-NL')}/kWh`),
  installationCost: z.number().min(V.battery.installationCost.min).max(V.battery.installationCost.max),
  annualMaintenanceCost: z.number().min(V.battery.annualMaintenanceCost.min).max(V.battery.annualMaintenanceCost.max),
  lifespanYears: z.number().min(V.battery.lifespanYears.min).max(V.battery.lifespanYears.max),
  // Energy profile fields
  sector: z.enum(['hospitality', 'healthcare', 'retail', 'kantoor', 'industrie', 'logistiek', 'onderwijs', 'overig']),
  annualConsumptionKwh: z.number().min(V.profile.annualConsumptionKwh.min, `Min ${V.profile.annualConsumptionKwh.min.toLocaleString('nl-NL')} kWh`).max(V.profile.annualConsumptionKwh.max, `Max ${V.profile.annualConsumptionKwh.max.toLocaleString('nl-NL')} kWh`),
  peakDemandKw: z.number().min(V.profile.peakDemandKw.min).max(V.profile.peakDemandKw.max),
  connectionCapacityKw: z.number().min(V.profile.connectionCapacityKw.min).max(V.profile.connectionCapacityKw.max),
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
  onRecommend?: (profileData: { sector: Sector; annualConsumptionKwh: number; peakDemandKw: number; connectionCapacityKw: number }) => Promise<SizingRecommendation>;
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

export function BatteryConfigurator({ defaultValues, onSubmit, onRecommend, isCalculating, hasCustomProfile }: BatteryConfiguratorProps) {
  // Convert 0-valued user fields to empty string so inputs render blank
  const empty = '' as unknown as number;
  const formDefaults = {
    ...defaultValues,
    annualConsumptionKwh: defaultValues.annualConsumptionKwh || empty,
    peakDemandKw: defaultValues.peakDemandKw || empty,
    connectionCapacityKw: defaultValues.connectionCapacityKw || empty,
    capacityKwh: defaultValues.capacityKwh || empty,
    powerKw: defaultValues.powerKw || empty,
  };

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    getValues,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(batterySchema),
    defaultValues: formDefaults as FormData,
  });

  // Sync form when external data arrives (CSV upload, AI extraction, project load)
  useEffect(() => {
    if (defaultValues.annualConsumptionKwh) setValue('annualConsumptionKwh', defaultValues.annualConsumptionKwh);
    if (defaultValues.peakDemandKw) setValue('peakDemandKw', defaultValues.peakDemandKw);
    if (defaultValues.connectionCapacityKw) setValue('connectionCapacityKw', defaultValues.connectionCapacityKw);
    if (defaultValues.capacityKwh) setValue('capacityKwh', defaultValues.capacityKwh);
    if (defaultValues.powerKw) setValue('powerKw', defaultValues.powerKw);
  }, [defaultValues.annualConsumptionKwh, defaultValues.peakDemandKw, defaultValues.connectionCapacityKw, defaultValues.capacityKwh, defaultValues.powerKw, setValue]);

  const sector = watch('sector');
  const [isRecommending, setIsRecommending] = useState(false);
  const [recommendation, setRecommendation] = useState<SizingRecommendation | null>(null);
  const [recommendError, setRecommendError] = useState<string | null>(null);

  async function handleRecommend() {
    if (!onRecommend) return;
    setIsRecommending(true);
    setRecommendError(null);
    setRecommendation(null);

    try {
      const values = getValues();
      const result = await onRecommend({
        sector: values.sector,
        annualConsumptionKwh: values.annualConsumptionKwh,
        peakDemandKw: values.peakDemandKw,
        connectionCapacityKw: values.connectionCapacityKw,
      });

      setRecommendation(result);

      // Auto-fill battery fields with recommendation
      const bc = result.batteryConfig;
      setValue('capacityKwh', bc.capacityKwh);
      setValue('powerKw', bc.powerKw);
      setValue('costPerKwh', bc.costPerKwh);
      setValue('installationCost', bc.installationCost);
      setValue('annualMaintenanceCost', bc.annualMaintenanceCost);
      setValue('lifespanYears', bc.lifespanYears);
      setValue('roundTripEfficiency', bc.roundTripEfficiency);
      setValue('annualDegradation', bc.annualDegradation);
      setValue('cycleLife', bc.cycleLife);
      setValue('depthOfDischarge', bc.depthOfDischarge);
    } catch (err) {
      setRecommendError(err instanceof Error ? err.message : 'Aanbeveling mislukt');
    } finally {
      setIsRecommending(false);
    }
  }

  function applyAlternative(candidate: { capacityKwh: number; powerKw: number }) {
    if (!recommendation) return;
    // Recalculate costs for this alternative size
    const perKwh = 60 - Math.min(30, candidate.capacityKwh / 20);
    setValue('capacityKwh', candidate.capacityKwh);
    setValue('powerKw', candidate.powerKw);
    setValue('installationCost', Math.round(5000 + candidate.capacityKwh * perKwh));
    setValue('annualMaintenanceCost', Math.round(500 + candidate.capacityKwh * 8));
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
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
            placeholder="bijv. 500000"
            error={errors.annualConsumptionKwh?.message}
            {...register('annualConsumptionKwh', { valueAsNumber: true })}
          />
          <InputField
            label="Piekvermogen"
            unit="kW"
            tooltip="Maximaal gelijktijdig vermogen dat u afneemt. Bepaalt uw netwerktarief."
            placeholder="bijv. 200"
            error={errors.peakDemandKw?.message}
            {...register('peakDemandKw', { valueAsNumber: true })}
          />
          <InputField
            label="Aansluitcapaciteit"
            unit="kW"
            tooltip="Capaciteit van uw netaansluiting. Staat in uw contract met de netbeheerder."
            placeholder="bijv. 300"
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

        {/* Recommend Button */}
        {onRecommend && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleRecommend}
              disabled={isRecommending}
              className={clsx(
                'flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed py-3 text-sm font-semibold transition',
                isRecommending
                  ? 'cursor-wait border-gray-300 bg-gray-50 text-gray-400'
                  : 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:border-emerald-400 hover:bg-emerald-100'
              )}
            >
              {isRecommending ? (
                <>
                  <Zap className="h-4 w-4 animate-pulse" />
                  Optimale batterij wordt berekend...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Bereken optimale batterijgrootte
                </>
              )}
            </button>

            {recommendError && (
              <p className="text-sm text-red-600">{recommendError}</p>
            )}

            {recommendation && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <p className="text-sm text-emerald-800">{recommendation.rationale}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-emerald-700">{recommendation.recommended.capacityKwh} kWh</div>
                    <div className="text-xs text-emerald-600">Capaciteit</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-emerald-700">{recommendation.recommended.powerKw} kW</div>
                    <div className="text-xs text-emerald-600">Vermogen</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-emerald-700">
                      {recommendation.recommended.npv > 0 ? '+' : ''}{Math.round(recommendation.recommended.npv).toLocaleString('nl-NL')}
                    </div>
                    <div className="text-xs text-emerald-600">NPV (EUR)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-emerald-700">
                      {recommendation.recommended.simplePayback != null
                        ? `${recommendation.recommended.simplePayback.toFixed(1)} jr`
                        : '> horizon'}
                    </div>
                    <div className="text-xs text-emerald-600">Terugverdientijd</div>
                  </div>
                </div>

                {(recommendation.conservative || recommendation.aggressive) && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {recommendation.conservative && (
                      <button
                        type="button"
                        onClick={() => applyAlternative(recommendation.conservative!)}
                        className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 transition"
                      >
                        Conservatief: {recommendation.conservative.capacityKwh} kWh
                      </button>
                    )}
                    {recommendation.aggressive && (
                      <button
                        type="button"
                        onClick={() => applyAlternative(recommendation.aggressive!)}
                        className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 transition"
                      >
                        Ambitieus: {recommendation.aggressive.capacityKwh} kWh
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <InputField
            label="Capaciteit"
            unit="kWh"
            tooltip="Hoeveel energie de batterij kan opslaan. Vergelijkbaar met het formaat van een watertank."
            placeholder="Vul in of gebruik aanbeveling"
            error={errors.capacityKwh?.message}
            {...register('capacityKwh', { valueAsNumber: true })}
          />
          <InputField
            label="Vermogen"
            unit="kW"
            tooltip="Hoe snel de batterij kan laden en ontladen. Vergelijkbaar met de diameter van een kraan."
            placeholder="Vul in of gebruik aanbeveling"
            error={errors.powerKw?.message}
            {...register('powerKw', { valueAsNumber: true })}
          />
          <InputField
            label="Kosten per kWh"
            unit="EUR/kWh"
            tooltip="Aanschafprijs per kWh opslagcapaciteit. Marktgemiddelde 2024: EUR 400-700/kWh."
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
