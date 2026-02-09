import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Calculator, Loader2 } from 'lucide-react';
import type { BatteryConfig, NamedBatteryConfig, ComparisonResult } from '../types';
import { ConfigCard, ComparisonTable, ComparisonSummary } from '../components/comparison';
import type { EnergyProfile, TariffStructure, SubsidyConfig, FinancialParams } from '../types';
import { calculateViaAPI, sensitivityViaAPI } from '../services/api/api-client';

interface ComparisonPageProps {
  batteryConfig: BatteryConfig;
  energyProfile: EnergyProfile;
  tariffs: TariffStructure;
  subsidies: SubsidyConfig;
  financials: FinancialParams;
}

export function ComparisonPage({
  batteryConfig,
  energyProfile,
  tariffs,
  subsidies,
  financials,
}: ComparisonPageProps) {
  const navigate = useNavigate();

  const [configs, setConfigs] = useState<NamedBatteryConfig[]>([
    { id: 'config-1', label: 'Configuratie 1', config: { ...batteryConfig } },
  ]);
  const [results, setResults] = useState<ComparisonResult[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);

  function addConfig() {
    if (configs.length >= 3) return;
    const num = configs.length + 1;
    setConfigs([...configs, {
      id: `config-${Date.now()}`,
      label: `Configuratie ${num}`,
      config: { ...batteryConfig },
    }]);
  }

  function removeConfig(id: string) {
    if (configs.length <= 1) return;
    setConfigs(configs.filter((c) => c.id !== id));
    setResults(results.filter((r) => r.configId !== id));
  }

  function updateConfig(id: string, config: BatteryConfig) {
    setConfigs(configs.map((c) => c.id === id ? { ...c, config } : c));
  }

  function updateLabel(id: string, label: string) {
    setConfigs(configs.map((c) => c.id === id ? { ...c, label } : c));
  }

  async function calculateAll() {
    setIsCalculating(true);
    try {
      const promises = configs.map(async (c) => {
        const [calcResult, sensitivityData] = await Promise.all([
          calculateViaAPI(c.config, energyProfile, tariffs, subsidies, financials),
          sensitivityViaAPI(c.config, energyProfile, tariffs, subsidies, financials),
        ]);
        return {
          configId: c.id,
          label: c.label,
          config: c.config,
          results: calcResult,
          sensitivity: sensitivityData,
        } satisfies ComparisonResult;
      });

      const allResults = await Promise.all(promises);
      setResults(allResults);
    } catch (err) {
      console.error('Comparison calculation failed:', err);
      setResults([]);
    } finally {
      setIsCalculating(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/results')}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Terug naar resultaten
        </button>
      </div>

      <h1 className="text-3xl font-bold text-gray-900">Configuratievergelijking</h1>
      <p className="text-sm text-gray-500">
        Vergelijk tot 3 batterijconfiguraties naast elkaar. Tarief-, subsidie- en financiele parameters worden gedeeld.
      </p>

      {/* Config cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {configs.map((c, i) => (
          <ConfigCard
            key={c.id}
            label={c.label}
            config={c.config}
            onChange={(config) => updateConfig(c.id, config)}
            onLabelChange={(label) => updateLabel(c.id, label)}
            onRemove={() => removeConfig(c.id)}
            isFirst={i === 0}
          />
        ))}

        {configs.length < 3 && (
          <button
            onClick={addConfig}
            className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-500 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600"
          >
            <Plus className="h-5 w-5" />
            Configuratie toevoegen
          </button>
        )}
      </div>

      {/* Calculate button */}
      <div className="flex justify-center">
        <button
          onClick={calculateAll}
          disabled={isCalculating || configs.length === 0}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {isCalculating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Berekenen...
            </>
          ) : (
            <>
              <Calculator className="h-4 w-4" />
              Bereken alle configuraties
            </>
          )}
        </button>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <>
          <ComparisonSummary results={results} />
          <ComparisonTable results={results} />
        </>
      )}

      {/* Disclaimer */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <strong>Disclaimer:</strong> Alle berekeningen zijn indicatief. Werkelijke resultaten kunnen afwijken
        door marktomstandigheden, regelgeving en technische factoren.
      </div>
    </div>
  );
}
