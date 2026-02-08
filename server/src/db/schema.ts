export const SCHEMA = `
CREATE TABLE IF NOT EXISTS profiles (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name          TEXT NOT NULL,
  description   TEXT DEFAULT '',
  sector        TEXT NOT NULL,

  battery_config    TEXT NOT NULL,
  annual_consumption_kwh  REAL NOT NULL,
  peak_demand_kw          REAL NOT NULL,
  connection_capacity_kw  REAL NOT NULL,
  data_source             TEXT DEFAULT 'synthetic',
  tariff_config     TEXT NOT NULL,
  subsidy_config    TEXT NOT NULL,
  financial_params  TEXT NOT NULL,

  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS hourly_profiles (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  profile_id  TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  hourly_kwh  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(profile_id)
);

CREATE TABLE IF NOT EXISTS calculation_results (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  profile_id    TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  npv                 REAL NOT NULL,
  irr                 REAL,
  simple_payback      REAL NOT NULL,
  discounted_payback  REAL,
  annual_savings      REAL NOT NULL,
  total_savings       REAL NOT NULL,
  lcos                REAL NOT NULL,
  peak_shaving_savings REAL NOT NULL,
  peak_reduction_kw   REAL NOT NULL,
  gross_investment     REAL NOT NULL,
  net_investment       REAL NOT NULL,
  annual_subsidy       REAL NOT NULL,

  monthly_breakdown   TEXT NOT NULL,
  scenario_results    TEXT NOT NULL,
  sensitivity_data    TEXT,
  simulation_summary  TEXT NOT NULL,

  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_results_profile ON calculation_results(profile_id);
CREATE INDEX IF NOT EXISTS idx_profiles_sector ON profiles(sector);
`;
