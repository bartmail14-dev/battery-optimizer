import { randomUUID } from 'crypto';
import { getDb, saveDatabase } from '../client.js';

export interface CalculationResultRow {
  id: string;
  profile_id: string;
  npv: number;
  irr: number | null;
  simple_payback: number;
  discounted_payback: number | null;
  annual_savings: number;
  total_savings: number;
  lcos: number;
  peak_shaving_savings: number;
  peak_reduction_kw: number;
  gross_investment: number;
  net_investment: number;
  annual_subsidy: number;
  monthly_breakdown: string;
  scenario_results: string;
  sensitivity_data: string | null;
  simulation_summary: string;
  created_at: string;
}

export interface SaveCalculationInput {
  profileId: string;
  npv: number;
  irr: number;
  simplePayback: number;
  discountedPayback: number;
  annualSavings: number;
  totalSavings: number;
  lcos: number;
  peakShavingSavings: number;
  peakReductionKw: number;
  grossInvestment: number;
  netInvestment: number;
  annualSubsidy: number;
  monthlyBreakdown: unknown[];
  scenarioResults: unknown[];
  sensitivityData?: unknown[];
  simulationSummary: Record<string, unknown>;
}

function queryAll(sql: string, params: unknown[] = []): Record<string, unknown>[] {
  const db = getDb();
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const results: Record<string, unknown>[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as Record<string, unknown>);
  }
  stmt.free();
  return results;
}

function queryOne(sql: string, params: unknown[] = []): Record<string, unknown> | undefined {
  return queryAll(sql, params)[0];
}

export function saveCalculation(input: SaveCalculationInput): CalculationResultRow {
  const db = getDb();
  const id = randomUUID().replace(/-/g, '');

  db.run(`
    INSERT INTO calculation_results (
      id, profile_id, npv, irr, simple_payback, discounted_payback,
      annual_savings, total_savings, lcos, peak_shaving_savings,
      peak_reduction_kw, gross_investment, net_investment, annual_subsidy,
      monthly_breakdown, scenario_results, sensitivity_data, simulation_summary
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    input.profileId,
    input.npv,
    isFinite(input.irr) ? input.irr : null,
    input.simplePayback,
    isFinite(input.discountedPayback) ? input.discountedPayback : null,
    input.annualSavings,
    input.totalSavings,
    input.lcos,
    input.peakShavingSavings,
    input.peakReductionKw,
    input.grossInvestment,
    input.netInvestment,
    input.annualSubsidy,
    JSON.stringify(input.monthlyBreakdown),
    JSON.stringify(input.scenarioResults),
    input.sensitivityData ? JSON.stringify(input.sensitivityData) : null,
    JSON.stringify(input.simulationSummary),
  ]);
  saveDatabase();

  return getCalculation(id)!;
}

export function getCalculation(id: string): CalculationResultRow | undefined {
  const row = queryOne('SELECT * FROM calculation_results WHERE id = ?', [id]);
  if (!row) return undefined;
  return row as unknown as CalculationResultRow;
}

export function listCalculationsForProfile(profileId: string): CalculationResultRow[] {
  return queryAll(
    'SELECT * FROM calculation_results WHERE profile_id = ? ORDER BY created_at DESC',
    [profileId]
  ) as unknown as CalculationResultRow[];
}
