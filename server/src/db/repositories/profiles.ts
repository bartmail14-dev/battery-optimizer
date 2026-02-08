import { randomUUID } from 'crypto';
import { getDb, saveDatabase } from '../client.js';

export interface ProfileRow {
  id: string;
  name: string;
  description: string;
  sector: string;
  battery_config: string;
  annual_consumption_kwh: number;
  peak_demand_kw: number;
  connection_capacity_kw: number;
  data_source: string;
  tariff_config: string;
  subsidy_config: string;
  financial_params: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProfileInput {
  name: string;
  description?: string;
  sector: string;
  batteryConfig: Record<string, unknown>;
  annualConsumptionKwh: number;
  peakDemandKw: number;
  connectionCapacityKw: number;
  dataSource: string;
  tariffConfig: Record<string, unknown>;
  subsidyConfig: Record<string, unknown>;
  financialParams: Record<string, unknown>;
  hourlyConsumptionKwh?: number[];
}

function rowToProfile(row: Record<string, unknown>): ProfileRow {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) ?? '',
    sector: row.sector as string,
    battery_config: row.battery_config as string,
    annual_consumption_kwh: row.annual_consumption_kwh as number,
    peak_demand_kw: row.peak_demand_kw as number,
    connection_capacity_kw: row.connection_capacity_kw as number,
    data_source: (row.data_source as string) ?? 'synthetic',
    tariff_config: row.tariff_config as string,
    subsidy_config: row.subsidy_config as string,
    financial_params: row.financial_params as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
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
  const rows = queryAll(sql, params);
  return rows[0];
}

function execute(sql: string, params: unknown[] = []) {
  const db = getDb();
  db.run(sql, params);
  saveDatabase();
}

export function listProfiles(): ProfileRow[] {
  return queryAll(
    'SELECT * FROM profiles ORDER BY updated_at DESC'
  ).map(rowToProfile);
}

export function getProfile(id: string): ProfileRow | undefined {
  const row = queryOne('SELECT * FROM profiles WHERE id = ?', [id]);
  return row ? rowToProfile(row) : undefined;
}

export function getHourlyProfile(profileId: string): number[] | null {
  const row = queryOne('SELECT hourly_kwh FROM hourly_profiles WHERE profile_id = ?', [profileId]);
  if (!row) return null;
  return JSON.parse(row.hourly_kwh as string) as number[];
}

export function createProfile(input: CreateProfileInput): ProfileRow {
  const id = randomUUID().replace(/-/g, '');

  execute(`
    INSERT INTO profiles (id, name, description, sector, battery_config,
      annual_consumption_kwh, peak_demand_kw, connection_capacity_kw,
      data_source, tariff_config, subsidy_config, financial_params)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    input.name,
    input.description ?? '',
    input.sector,
    JSON.stringify(input.batteryConfig),
    input.annualConsumptionKwh,
    input.peakDemandKw,
    input.connectionCapacityKw,
    input.dataSource,
    JSON.stringify(input.tariffConfig),
    JSON.stringify(input.subsidyConfig),
    JSON.stringify(input.financialParams),
  ]);

  if (input.hourlyConsumptionKwh && input.hourlyConsumptionKwh.length > 0) {
    execute(`
      INSERT INTO hourly_profiles (id, profile_id, hourly_kwh)
      VALUES (?, ?, ?)
    `, [randomUUID().replace(/-/g, ''), id, JSON.stringify(input.hourlyConsumptionKwh)]);
  }

  return getProfile(id)!;
}

export function updateProfile(id: string, input: Partial<CreateProfileInput>): ProfileRow | undefined {
  const existing = getProfile(id);
  if (!existing) return undefined;

  const fields: string[] = [];
  const values: unknown[] = [];

  if (input.name !== undefined) { fields.push('name = ?'); values.push(input.name); }
  if (input.description !== undefined) { fields.push('description = ?'); values.push(input.description); }
  if (input.sector !== undefined) { fields.push('sector = ?'); values.push(input.sector); }
  if (input.batteryConfig !== undefined) { fields.push('battery_config = ?'); values.push(JSON.stringify(input.batteryConfig)); }
  if (input.annualConsumptionKwh !== undefined) { fields.push('annual_consumption_kwh = ?'); values.push(input.annualConsumptionKwh); }
  if (input.peakDemandKw !== undefined) { fields.push('peak_demand_kw = ?'); values.push(input.peakDemandKw); }
  if (input.connectionCapacityKw !== undefined) { fields.push('connection_capacity_kw = ?'); values.push(input.connectionCapacityKw); }
  if (input.tariffConfig !== undefined) { fields.push('tariff_config = ?'); values.push(JSON.stringify(input.tariffConfig)); }
  if (input.subsidyConfig !== undefined) { fields.push('subsidy_config = ?'); values.push(JSON.stringify(input.subsidyConfig)); }
  if (input.financialParams !== undefined) { fields.push('financial_params = ?'); values.push(JSON.stringify(input.financialParams)); }

  if (fields.length > 0) {
    fields.push("updated_at = datetime('now')");
    values.push(id);
    execute(`UPDATE profiles SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  return getProfile(id);
}

export function deleteProfile(id: string): boolean {
  const db = getDb();
  db.run('DELETE FROM profiles WHERE id = ?', [id]);
  saveDatabase();
  // sql.js doesn't return changes count easily, check if profile exists
  return !getProfile(id);
}
