import { Trash2 } from 'lucide-react';
import type { BatteryConfig } from '../../types';

interface ConfigCardProps {
  label: string;
  config: BatteryConfig;
  onChange: (config: BatteryConfig) => void;
  onLabelChange: (label: string) => void;
  onRemove?: () => void;
  isFirst?: boolean;
}

export function ConfigCard({ label, config, onChange, onLabelChange, onRemove, isFirst }: ConfigCardProps) {
  function updateField(field: keyof BatteryConfig, value: number) {
    onChange({ ...config, [field]: value });
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <input
          type="text"
          value={label}
          onChange={(e) => onLabelChange(e.target.value)}
          className="text-lg font-semibold text-gray-900 border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none"
        />
        {!isFirst && onRemove && (
          <button
            onClick={onRemove}
            className="rounded-lg p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
            title="Verwijder configuratie"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500">Capaciteit (kWh)</label>
          <input
            type="number"
            value={config.capacityKwh}
            onChange={(e) => updateField('capacityKwh', Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500">Vermogen (kW)</label>
          <input
            type="number"
            value={config.powerKw}
            onChange={(e) => updateField('powerKw', Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500">Kosten/kWh</label>
          <input
            type="number"
            value={config.costPerKwh}
            onChange={(e) => updateField('costPerKwh', Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500">Installatie</label>
          <input
            type="number"
            value={config.installationCost}
            onChange={(e) => updateField('installationCost', Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500">Onderhoud/jaar</label>
          <input
            type="number"
            value={config.annualMaintenanceCost}
            onChange={(e) => updateField('annualMaintenanceCost', Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500">Levensduur (jaar)</label>
          <input
            type="number"
            value={config.lifespanYears}
            onChange={(e) => updateField('lifespanYears', Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
          />
        </div>
      </div>
    </div>
  );
}
