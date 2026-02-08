import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  listProfiles,
  getProfile,
  getHourlyProfile,
  createProfile,
  updateProfile,
  deleteProfile,
} from '../db/repositories/profiles.js';
import {
  saveCalculation,
  listCalculationsForProfile,
  getCalculation,
} from '../db/repositories/calculations.js';
import { calculateFullResult, sensitivityAnalysis } from '../../../src/services/calculations/index.js';
import { generateHourlyProfile } from '../../../src/services/calculations/profile-generator.js';
import type { EnergyProfile, Sector } from '../../../src/types/index.js';

const router = Router();

const CreateProfileSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  sector: z.string(),
  batteryConfig: z.record(z.unknown()),
  annualConsumptionKwh: z.number().nonnegative(),
  peakDemandKw: z.number().nonnegative(),
  connectionCapacityKw: z.number().positive(),
  dataSource: z.enum(['synthetic', 'csv']).default('synthetic'),
  tariffConfig: z.record(z.unknown()),
  subsidyConfig: z.record(z.unknown()),
  financialParams: z.record(z.unknown()),
  hourlyConsumptionKwh: z.array(z.number()).optional(),
});

// List all profiles
router.get('/profiles', (_req: Request, res: Response) => {
  const profiles = listProfiles();
  res.json(profiles.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    sector: p.sector,
    annualConsumptionKwh: p.annual_consumption_kwh,
    peakDemandKw: p.peak_demand_kw,
    dataSource: p.data_source,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  })));
});

// Get single profile
router.get('/profiles/:id', (req: Request, res: Response) => {
  const id = req.params.id as string;
  const profile = getProfile(id);
  if (!profile) {
    res.status(404).json({ error: 'Profile not found' });
    return;
  }
  const hourlyData = getHourlyProfile(profile.id);
  res.json({
    ...profile,
    battery_config: JSON.parse(profile.battery_config),
    tariff_config: JSON.parse(profile.tariff_config),
    subsidy_config: JSON.parse(profile.subsidy_config),
    financial_params: JSON.parse(profile.financial_params),
    hourlyConsumptionKwh: hourlyData,
  });
});

// Create profile
router.post('/profiles', (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = CreateProfileSchema.parse(req.body);
    const profile = createProfile(input);
    res.status(201).json(profile);
  } catch (err) {
    next(err);
  }
});

// Update profile
router.put('/profiles/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const updated = updateProfile(id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Delete profile
router.delete('/profiles/:id', (req: Request, res: Response) => {
  const id = req.params.id as string;
  const deleted = deleteProfile(id);
  if (!deleted) {
    res.status(404).json({ error: 'Profile not found' });
    return;
  }
  res.json({ deleted: true });
});

// Calculate and save for a profile
router.post('/profiles/:id/calculate', (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const profile = getProfile(id);
    if (!profile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    const batteryConfig = JSON.parse(profile.battery_config);
    const tariffs = JSON.parse(profile.tariff_config);
    const subsidies = JSON.parse(profile.subsidy_config);
    const financials = JSON.parse(profile.financial_params);

    // Get hourly data or generate synthetic
    const hourlyData = getHourlyProfile(profile.id);
    const hourlyConsumptionKwh = hourlyData ?? generateHourlyProfile(
      profile.annual_consumption_kwh,
      profile.peak_demand_kw,
      profile.sector as Sector
    );

    const energyProfile: EnergyProfile = {
      hourlyConsumptionKwh,
      peakDemandKw: profile.peak_demand_kw,
      annualConsumptionKwh: profile.annual_consumption_kwh,
      connectionCapacityKw: profile.connection_capacity_kw,
      sector: profile.sector as Sector,
      dataSource: profile.data_source as 'synthetic' | 'csv',
    };

    const result = calculateFullResult(batteryConfig, energyProfile, tariffs, subsidies, financials);
    const sensitivity = sensitivityAnalysis(batteryConfig, energyProfile, tariffs, subsidies, financials);

    // Save result (without full hourly simulation data)
    const { hourlyResults: _hr, ...simulationSummary } = result.simulation;
    const saved = saveCalculation({
      profileId: profile.id,
      npv: result.npv,
      irr: result.irr,
      simplePayback: result.simplePayback,
      discountedPayback: result.discountedPayback,
      annualSavings: result.annualSavings,
      totalSavings: result.totalSavings,
      lcos: result.lcos,
      peakShavingSavings: result.peakShavingSavings,
      peakReductionKw: result.peakReductionKw,
      grossInvestment: result.grossInvestment,
      netInvestment: result.netInvestment,
      annualSubsidy: result.annualSubsidy,
      monthlyBreakdown: result.monthlyBreakdown,
      scenarioResults: result.scenarioResults,
      sensitivityData: sensitivity,
      simulationSummary,
    });

    res.json({
      calculationId: saved.id,
      result,
      sensitivity,
    });
  } catch (err) {
    next(err);
  }
});

// List saved results for a profile
router.get('/profiles/:id/results', (req: Request, res: Response) => {
  const id = req.params.id as string;
  const results = listCalculationsForProfile(id);
  res.json(results.map((r) => ({
    id: r.id,
    npv: r.npv,
    annualSavings: r.annual_savings,
    simplePayback: r.simple_payback,
    createdAt: r.created_at,
  })));
});

// Get single calculation result
router.get('/profiles/:id/results/:rid', (req: Request, res: Response) => {
  const rid = req.params.rid as string;
  const id = req.params.id as string;
  const result = getCalculation(rid);
  if (!result || result.profile_id !== id) {
    res.status(404).json({ error: 'Calculation result not found' });
    return;
  }
  res.json({
    ...result,
    monthly_breakdown: JSON.parse(result.monthly_breakdown),
    scenario_results: JSON.parse(result.scenario_results),
    sensitivity_data: result.sensitivity_data ? JSON.parse(result.sensitivity_data) : null,
    simulation_summary: JSON.parse(result.simulation_summary),
  });
});

export default router;
