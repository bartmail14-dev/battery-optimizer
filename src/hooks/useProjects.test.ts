import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProjects } from './useProjects';

vi.mock('../services/api/projects-client', () => ({
  fetchProjects: vi.fn(),
  fetchProject: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
}));

import {
  fetchProjects,
  fetchProject,
  createProject,
  deleteProject,
} from '../services/api/projects-client';
import type { FullProject } from '../services/api/projects-client';
import type { ProjectSummary } from '../types';

const mockFetchProjects = vi.mocked(fetchProjects);
const mockFetchProject = vi.mocked(fetchProject);
const mockCreateProject = vi.mocked(createProject);
const mockDeleteProject = vi.mocked(deleteProject);

const sampleSummary: ProjectSummary = {
  id: 'p1',
  name: 'Test Project',
  description: 'Een test',
  sector: 'hospitality',
  annualConsumptionKwh: 200000,
  peakDemandKw: 80,
  dataSource: 'synthetic',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

const sampleFull: FullProject = {
  id: 'p1',
  name: 'Test Project',
  description: 'Een test',
  sector: 'hospitality',
  annualConsumptionKwh: 200000,
  peakDemandKw: 80,
  connectionCapacityKw: 100,
  dataSource: 'synthetic',
  batteryConfig: {
    capacityKwh: 100,
    powerKw: 50,
    roundTripEfficiency: 0.89,
    annualDegradation: 0.025,
    cycleLife: 6000,
    depthOfDischarge: 0.9,
    costPerKwh: 550,
    installationCost: 15000,
    annualMaintenanceCost: 2000,
    lifespanYears: 15,
  },
  tariffs: {
    commodityRatePerKwh: 0.12,
    peakRate: 0.22,
    offPeakRate: 0.14,
    networkTariffPerKw: 27.5,
    energyTaxPerKwh: 0.01312,
    odeSurchargePerKwh: 0.00642,
    feedInTariffPerKwh: 0.07,
    pricingMode: 'dynamic',
  },
  subsidies: {
    sdeEligible: true,
    sdeBaseAmount: 0.068,
    eiaPercentage: 0.455,
    eiaMaxDeduction: 136000000,
  },
  financials: {
    discountRate: 0.06,
    inflationRate: 0.02,
    electricityPriceGrowthRate: 0.03,
    years: 15,
  },
  hourlyConsumptionKwh: null,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

describe('useProjects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts with empty projects list', () => {
    const { result } = renderHook(() => useProjects());
    expect(result.current.projects).toHaveLength(0);
    expect(result.current.currentProjectId).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('loadProjects fetches and sets projects', async () => {
    mockFetchProjects.mockResolvedValue([sampleSummary]);

    const { result } = renderHook(() => useProjects());

    await act(async () => {
      await result.current.loadProjects();
    });

    expect(result.current.projects).toHaveLength(1);
    expect(result.current.projects[0].name).toBe('Test Project');
    expect(result.current.isLoading).toBe(false);
  });

  it('loadProjects sets error on failure', async () => {
    mockFetchProjects.mockRejectedValue(new Error('Netwerk fout'));

    const { result } = renderHook(() => useProjects());

    await act(async () => {
      await result.current.loadProjects();
    });

    expect(result.current.error).toBe('Netwerk fout');
    expect(result.current.projects).toHaveLength(0);
  });

  it('saveProject creates and refreshes list', async () => {
    mockCreateProject.mockResolvedValue({ id: 'new-1' });
    mockFetchProjects.mockResolvedValue([{ ...sampleSummary, id: 'new-1' }]);

    const { result } = renderHook(() => useProjects());

    let id: string | null = null;
    await act(async () => {
      id = await result.current.saveProject('Nieuw Project', 'Beschrijving', {
        name: 'Nieuw Project',
        description: 'Beschrijving',
        sector: 'hospitality',
        batteryConfig: sampleFull.batteryConfig,
        annualConsumptionKwh: 200000,
        peakDemandKw: 80,
        connectionCapacityKw: 100,
        tariffConfig: sampleFull.tariffs,
        subsidyConfig: sampleFull.subsidies,
        financialParams: sampleFull.financials,
      });
    });

    expect(id).toBe('new-1');
    expect(result.current.currentProjectId).toBe('new-1');
    expect(mockCreateProject).toHaveBeenCalledTimes(1);
    expect(mockFetchProjects).toHaveBeenCalledTimes(1);
  });

  it('loadProject fetches full project and sets currentProjectId', async () => {
    mockFetchProject.mockResolvedValue(sampleFull);

    const { result } = renderHook(() => useProjects());

    let project: FullProject | null = null;
    await act(async () => {
      project = await result.current.loadProject('p1');
    });

    expect(project).not.toBeNull();
    expect(project!.name).toBe('Test Project');
    expect(project!.batteryConfig.capacityKwh).toBe(100);
    expect(result.current.currentProjectId).toBe('p1');
  });

  it('deleteProject removes and refreshes list', async () => {
    mockDeleteProject.mockResolvedValue(undefined);
    mockFetchProjects.mockResolvedValue([]);

    const { result } = renderHook(() => useProjects());

    // Set a current project first
    act(() => result.current.setCurrentProjectId('p1'));

    await act(async () => {
      const success = await result.current.deleteProject('p1');
      expect(success).toBe(true);
    });

    expect(result.current.currentProjectId).toBeNull();
    expect(mockDeleteProject).toHaveBeenCalledWith('p1');
    expect(mockFetchProjects).toHaveBeenCalledTimes(1);
  });

  it('deleteProject sets error on failure', async () => {
    mockDeleteProject.mockRejectedValue(new Error('Niet gevonden'));

    const { result } = renderHook(() => useProjects());

    await act(async () => {
      const success = await result.current.deleteProject('nonexistent');
      expect(success).toBe(false);
    });

    expect(result.current.error).toBe('Niet gevonden');
  });
});
