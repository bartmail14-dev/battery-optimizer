import type {
  BatteryConfig,
  EnergyProfile,
  TariffStructure,
  SubsidyConfig,
  FinancialParams,
  CalculationResult,
  SensitivityDataPoint,
} from '../../types';

const API_BASE = '/api';

class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

async function apiRequest<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, error.error || 'API request failed', error.details);
  }

  return res.json() as Promise<T>;
}

function buildProfilePayload(profile: EnergyProfile) {
  return {
    // Only send hourly data for CSV uploads — backend generates synthetic profiles
    hourlyConsumptionKwh: profile.dataSource === 'csv' ? profile.hourlyConsumptionKwh : null,
    peakDemandKw: profile.peakDemandKw,
    annualConsumptionKwh: profile.annualConsumptionKwh,
    connectionCapacityKw: profile.connectionCapacityKw,
    sector: profile.sector,
    dataSource: profile.dataSource,
  };
}

export async function calculateViaAPI(
  battery: BatteryConfig,
  profile: EnergyProfile,
  tariffs: TariffStructure,
  subsidies: SubsidyConfig,
  financials: FinancialParams
): Promise<CalculationResult> {
  return apiRequest<CalculationResult>('/calculate', {
    battery,
    profile: buildProfilePayload(profile),
    tariffs,
    subsidies,
    financials,
  });
}

export async function sensitivityViaAPI(
  battery: BatteryConfig,
  profile: EnergyProfile,
  tariffs: TariffStructure,
  subsidies: SubsidyConfig,
  financials: FinancialParams
): Promise<SensitivityDataPoint[]> {
  return apiRequest<SensitivityDataPoint[]>('/sensitivity', {
    battery,
    profile: buildProfilePayload(profile),
    tariffs,
    subsidies,
    financials,
  });
}

export async function healthCheck(): Promise<{ status: string; version: string }> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new ApiError(res.status, 'Health check failed');
  return res.json();
}
