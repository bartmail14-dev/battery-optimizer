import type { CalculationResult, BatteryConfig, EnergyProfile, TariffStructure, SubsidyConfig, FinancialParams } from '../../types';

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

function buildProfilePayload(profile: EnergyProfile) {
  return {
    hourlyConsumptionKwh: profile.dataSource === 'csv' ? profile.hourlyConsumptionKwh : null,
    peakDemandKw: profile.peakDemandKw,
    annualConsumptionKwh: profile.annualConsumptionKwh,
    connectionCapacityKw: profile.connectionCapacityKw,
    sector: profile.sector,
    dataSource: profile.dataSource,
  };
}

interface AdviseCallbacks {
  onResults: (results: CalculationResult) => void;
  onNarrativeChunk: (chunk: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}

export function adviseViaSSE(
  battery: BatteryConfig,
  profile: EnergyProfile,
  tariffs: TariffStructure,
  subsidies: SubsidyConfig,
  financials: FinancialParams,
  callbacks: AdviseCallbacks
): AbortController {
  const controller = new AbortController();

  const body = JSON.stringify({
    battery,
    profile: buildProfilePayload(profile),
    tariffs,
    subsidies,
    financials,
  });

  fetch(`${API_BASE}/advise`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        callbacks.onError(err.error || 'API request failed');
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        callbacks.onError('Geen streaming response');
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        let eventType = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              switch (eventType) {
                case 'results':
                  callbacks.onResults(parsed as CalculationResult);
                  break;
                case 'narrative':
                  callbacks.onNarrativeChunk(parsed as string);
                  break;
                case 'narrative_error':
                  callbacks.onError(parsed as string);
                  break;
                case 'done':
                  callbacks.onDone();
                  break;
              }
            } catch {
              // Skip malformed JSON
            }
            eventType = '';
          }
        }
      }

      // If we finished reading without a done event, signal done
      callbacks.onDone();
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        callbacks.onError(err instanceof Error ? err.message : 'Verbinding mislukt');
      }
    });

  return controller;
}

export async function generateReportViaAPI(
  battery: BatteryConfig,
  profile: EnergyProfile,
  tariffs: TariffStructure,
  subsidies: SubsidyConfig,
  financials: FinancialParams
): Promise<{ narrative: string; results: CalculationResult }> {
  const res = await fetch(`${API_BASE}/generate-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      battery,
      profile: buildProfilePayload(profile),
      tariffs,
      subsidies,
      financials,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Rapport generatie mislukt');
  }

  return res.json();
}
