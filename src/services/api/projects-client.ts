import type {
  ProjectSummary,
  BatteryConfig,
  TariffStructure,
  SubsidyConfig,
  FinancialParams,
  Sector,
} from '../../types';

const API_BASE = '/api';

interface RawProfile {
  id: string;
  name: string;
  description: string;
  sector: string;
  annual_consumption_kwh: number;
  peak_demand_kw: number;
  connection_capacity_kw: number;
  data_source: string;
  battery_config: BatteryConfig;
  tariff_config: TariffStructure;
  subsidy_config: SubsidyConfig;
  financial_params: FinancialParams;
  hourlyConsumptionKwh: number[] | null;
  created_at: string;
  updated_at: string;
}

export interface FullProject {
  id: string;
  name: string;
  description: string;
  sector: Sector;
  annualConsumptionKwh: number;
  peakDemandKw: number;
  connectionCapacityKw: number;
  dataSource: 'synthetic' | 'csv';
  batteryConfig: BatteryConfig;
  tariffs: TariffStructure;
  subsidies: SubsidyConfig;
  financials: FinancialParams;
  hourlyConsumptionKwh: number[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  sector: string;
  batteryConfig: BatteryConfig;
  annualConsumptionKwh: number;
  peakDemandKw: number;
  connectionCapacityKw: number;
  dataSource?: 'synthetic' | 'csv';
  tariffConfig: TariffStructure;
  subsidyConfig: SubsidyConfig;
  financialParams: FinancialParams;
  hourlyConsumptionKwh?: number[];
}

class ProjectsApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ProjectsApiError';
    this.status = status;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ProjectsApiError(res.status, body.error || `API fout: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export async function fetchProjects(): Promise<ProjectSummary[]> {
  return request<ProjectSummary[]>('/profiles');
}

export async function fetchProject(id: string): Promise<FullProject> {
  const raw = await request<RawProfile>(`/profiles/${encodeURIComponent(id)}`);
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    sector: raw.sector as Sector,
    annualConsumptionKwh: raw.annual_consumption_kwh,
    peakDemandKw: raw.peak_demand_kw,
    connectionCapacityKw: raw.connection_capacity_kw,
    dataSource: raw.data_source as 'synthetic' | 'csv',
    batteryConfig: raw.battery_config,
    tariffs: raw.tariff_config,
    subsidies: raw.subsidy_config,
    financials: raw.financial_params,
    hourlyConsumptionKwh: raw.hourlyConsumptionKwh,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

export async function createProject(input: CreateProjectInput): Promise<{ id: string }> {
  return request<{ id: string }>('/profiles', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateProject(id: string, input: Partial<CreateProjectInput>): Promise<void> {
  await request(`/profiles/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function deleteProject(id: string): Promise<void> {
  await request(`/profiles/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
